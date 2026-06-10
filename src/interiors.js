import * as THREE from 'three';
import { mat } from './world.js';
import { placeModel, boxOf } from './assets.js';
import { spawnNpcs } from './npcs.js';

// Walk-in interiors for the Stonehill Inn and the Sleeping Giant, furnished
// with KayKit dungeon/furniture models over a simple plaster-and-beam shell.
// Each returns a self-contained "stage": its own scene, colliders, hotspots
// (exit door, bar info point, NPCs), spawn point, and tick.

const D = 'assets/dungeon/';
const F = 'assets/furniture/';

export const INTERIOR_MODELS = [
  D + 'floor_wood_large.gltf.glb',
  D + 'floor_wood_large_dark.gltf.glb',
  D + 'table_long.gltf.glb',
  D + 'table_medium_decorated_A.gltf.glb',
  D + 'table_medium_tablecloth_decorated_B.gltf.glb',
  D + 'table_small_decorated_A.gltf.glb',
  D + 'table_medium_broken.gltf.glb',
  D + 'table_small.gltf.glb',
  D + 'chair.gltf.glb',
  D + 'stool.gltf.glb',
  D + 'shelves.gltf.glb',
  D + 'keg.gltf.glb',
  D + 'keg_decorated.gltf.glb',
  D + 'barrel_small.gltf.glb',
  D + 'barrel_small_stack.gltf.glb',
  D + 'barrel_large.gltf.glb',
  D + 'crates_stacked.gltf.glb',
  D + 'box_small.gltf.glb',
  D + 'candle_lit.gltf.glb',
  D + 'candle_triple.gltf.glb',
  D + 'candle_melted.gltf.glb',
  D + 'bottle_A_brown.gltf.glb',
  D + 'bottle_B_green.gltf.glb',
  D + 'bottle_C_brown.gltf.glb',
  D + 'plate_food_A.gltf.glb',
  D + 'plate_stack.gltf.glb',
  D + 'stairs_wood.gltf.glb',
  D + 'torch_mounted.gltf.glb',
  D + 'banner_patternA_red.gltf.glb',
  F + 'rug_rectangle_stripes_A.gltf',
];

// place a model; sx/sy/sz override the uniform scale per axis (local space),
// solid adds a box collider from the settled world bounds.
function put(scene, colliders, path, { x = 0, y = 0, z = 0, ry = 0, s = 1, sx, sy, sz, solid = false, pad = 0.04, tint = null, rx = 0, rz = 0 } = {}) {
  const obj = placeModel(scene, path, { x, y, z, rotY: ry, scale: s, tint });
  if (sx != null || sy != null || sz != null) obj.scale.set(sx ?? s, sy ?? s, sz ?? s);
  if (rx) obj.rotation.x = rx;
  if (rz) obj.rotation.z = rz;
  if (solid) {
    const b = boxOf(obj);
    colliders.push({ minX: b.min.x - pad, maxX: b.max.x + pad, minZ: b.min.z - pad, maxZ: b.max.z + pad });
  }
  return obj;
}

function woodFloor(scene, path, w, d) {
  // 3.2 m planked tiles, sunk so their top sits at y=0 with the room shell
  const step = 3.2;
  for (let x = -w / 2 + step / 2; x < w / 2; x += step) {
    for (let z = -d / 2 + step / 2; z < d / 2; z += step) {
      placeModel(scene, path, { x, y: -0.04, z, scale: 0.8 });
    }
  }
}

function room(scene, { w, d, h, floor, wall, beam }) {
  const colliders = [];
  const floorMesh = new THREE.Mesh(new THREE.BoxGeometry(w + 1, 0.3, d + 1), mat(floor));
  floorMesh.position.y = -0.2;
  floorMesh.receiveShadow = true;
  scene.add(floorMesh);

  const ceiling = new THREE.Mesh(new THREE.BoxGeometry(w + 1, 0.3, d + 1), mat(beam));
  ceiling.position.y = h + 0.15;
  scene.add(ceiling);
  for (let i = 0; i < 3; i++) {
    const b = new THREE.Mesh(new THREE.BoxGeometry(w, 0.25, 0.3), mat(beam));
    b.position.set(0, h - 0.12, -d / 3 + (i * d) / 3);
    scene.add(b);
  }

  const walls = [
    { x: 0, z: -d / 2, w: w, rot: 0 },
    { x: 0, z: d / 2, w: w, rot: 0 },
    { x: -w / 2, z: 0, w: d, rot: Math.PI / 2 },
    { x: w / 2, z: 0, w: d, rot: Math.PI / 2 },
  ];
  for (const def of walls) {
    const m = new THREE.Mesh(new THREE.BoxGeometry(def.w + 0.6, h, 0.35), mat(wall));
    m.position.set(def.x, h / 2, def.z);
    m.rotation.y = def.rot;
    m.receiveShadow = true;
    scene.add(m);
  }
  // wall colliders (slightly inset so the player can't see through corners)
  colliders.push(
    { minX: -w / 2 - 1, maxX: w / 2 + 1, minZ: -d / 2 - 1, maxZ: -d / 2 + 0.2 },
    { minX: -w / 2 - 1, maxX: w / 2 + 1, minZ: d / 2 - 0.2, maxZ: d / 2 + 1 },
    { minX: -w / 2 - 1, maxX: -w / 2 + 0.2, minZ: -d / 2 - 1, maxZ: d / 2 + 1 },
    { minX: w / 2 - 0.2, maxX: w / 2 + 1, minZ: -d / 2 - 1, maxZ: d / 2 + 1 },
  );
  return colliders;
}

// Stone hearth shell (no fireplace model in the packs) with an emissive
// flame cone and a flickering point light.
function hearth(scene, colliders, x, z, rotY = 0) {
  const g = new THREE.Group();
  const stone = new THREE.Mesh(new THREE.BoxGeometry(2.2, 1.8, 0.8), mat(0x8d8678));
  stone.position.y = 0.9;
  g.add(stone);
  const opening = new THREE.Mesh(new THREE.BoxGeometry(1.2, 0.95, 0.3), mat(0x1a120a));
  opening.position.set(0, 0.55, 0.3);
  g.add(opening);
  const flame = new THREE.Mesh(
    new THREE.ConeGeometry(0.32, 0.7, 6),
    mat(0xff9a3c, { emissive: 0xff7a1a, emissiveIntensity: 3.4 })
  );
  flame.position.set(0, 0.5, 0.35);
  g.add(flame);
  const mantle = new THREE.Mesh(new THREE.BoxGeometry(2.5, 0.18, 1.0), mat(0x52402c));
  mantle.position.y = 1.86;
  g.add(mantle);
  g.position.set(x, 0, z);
  g.rotation.y = rotY;
  scene.add(g);
  colliders.push({ minX: x - 1.3, maxX: x + 1.3, minZ: z - 0.7, maxZ: z + 0.7 });

  const fire = new THREE.PointLight(0xff8c42, 14, 12, 1.8);
  fire.position.set(x, 1.1, z + 0.8);
  scene.add(fire);
  return { flame, fire };
}

// Tiny emissive flame cone perched on a lit candle/torch model (the KayKit
// flames are plain textured geometry) so they catch the bloom pass.
function candleFlame(scene, x, y, z, s = 1) {
  const f = new THREE.Mesh(
    new THREE.ConeGeometry(0.045 * s, 0.15 * s, 5),
    mat(0xffc46a, { emissive: 0xffa033, emissiveIntensity: 3 })
  );
  f.position.set(x, y, z);
  scene.add(f);
  return f;
}

function baseScene(bg) {
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(bg);
  return scene;
}

export function buildInn(locationId) {
  const scene = baseScene(0x14100a);
  const colliders = room(scene, { w: 12, d: 9, h: 3.4, floor: 0x4a3826, wall: 0xc9b08a, beam: 0x52402c });
  woodFloor(scene, D + 'floor_wood_large.gltf.glb', 12, 9);

  scene.add(new THREE.AmbientLight(0xffd9a8, 0.42));
  const lamp = new THREE.PointLight(0xffc685, 18, 18, 1.6);
  lamp.position.set(0.5, 2.9, 0);
  lamp.castShadow = true;
  lamp.shadow.normalBias = 0.06;
  lamp.shadow.bias = -0.002;
  scene.add(lamp);

  // --- the bar: two long-table segments along the west side, kegs + a
  // bottle-laden wall shelf behind, Toblen's station between them
  put(scene, colliders, D + 'table_long.gltf.glb', { x: -4.6, z: -1.44, sx: 0.55, sy: 0.8, sz: 0.72, solid: true });
  put(scene, colliders, D + 'table_long.gltf.glb', { x: -4.6, z: 1.44, sx: 0.55, sy: 0.8, sz: 0.72, solid: true });
  put(scene, colliders, D + 'shelves.gltf.glb', { x: -5.78, z: -1.2, ry: Math.PI / 2, s: 0.9 });
  put(scene, colliders, D + 'shelves.gltf.glb', { x: -5.78, z: 1.2, ry: Math.PI / 2, s: 0.9 });
  put(scene, colliders, D + 'keg_decorated.gltf.glb', { x: -5.0, z: -3.5, ry: Math.PI / 4, s: 0.55, solid: true });
  put(scene, colliders, D + 'barrel_small.gltf.glb', { x: -5.35, z: 3.6, s: 0.75, solid: true });
  // bar-top dressing
  put(scene, colliders, D + 'candle_triple.gltf.glb', { x: -4.6, y: 0.8, z: 0.2, s: 0.55 });
  put(scene, colliders, D + 'bottle_A_brown.gltf.glb', { x: -4.75, y: 0.8, z: -1.0, s: 0.5 });
  put(scene, colliders, D + 'bottle_B_green.gltf.glb', { x: -4.45, y: 0.8, z: 1.7, s: 0.5 });
  put(scene, colliders, D + 'plate_stack.gltf.glb', { x: -4.6, y: 0.8, z: -2.3, s: 0.5 });

  // --- hearth on the north wall, striped rug and decorated tables
  const { flame, fire } = hearth(scene, colliders, -1, -4.2, 0);
  put(scene, colliders, F + 'rug_rectangle_stripes_A.gltf', { x: -1, y: 0.012, z: -2.5, s: 1.15 });

  // tables come "decorated": candles, tankards, plates baked into the model
  put(scene, colliders, D + 'table_medium_decorated_A.gltf.glb', { x: 2.2, z: -2.4, ry: 0.3, s: 0.72, solid: true });
  put(scene, colliders, D + 'table_medium_tablecloth_decorated_B.gltf.glb', { x: 2.4, z: 2.3, ry: -0.2, s: 0.72, solid: true });
  put(scene, colliders, D + 'table_small_decorated_A.gltf.glb', { x: -1.4, z: 2.6, ry: 0.8, s: 0.8, solid: true });
  put(scene, colliders, D + 'candle_lit.gltf.glb', { x: 2.0, y: 0.72, z: -2.2, s: 0.45 });
  put(scene, colliders, D + 'plate_food_A.gltf.glb', { x: -1.4, y: 0.8, z: 2.6, s: 0.5 });

  // chairs and stools (walk-through, like the old procedural stools)
  put(scene, colliders, D + 'chair.gltf.glb', { x: 1.0, z: -2.2, ry: Math.PI / 2, s: 0.72 });
  put(scene, colliders, D + 'chair.gltf.glb', { x: 3.4, z: -2.7, ry: -Math.PI / 2 + 0.4, s: 0.72 });
  put(scene, colliders, D + 'chair.gltf.glb', { x: 2.2, z: 3.5, ry: Math.PI + 0.2, s: 0.72 });
  put(scene, colliders, D + 'chair.gltf.glb', { x: 3.6, z: 1.8, ry: -Math.PI / 2 - 0.5, s: 0.72 });
  put(scene, colliders, D + 'stool.gltf.glb', { x: -0.4, z: 2.0, s: 0.85 });
  put(scene, colliders, D + 'stool.gltf.glb', { x: -2.3, z: 3.0, s: 0.85 });
  put(scene, colliders, D + 'stool.gltf.glb', { x: -3.6, z: -1.0, s: 0.85 });
  put(scene, colliders, D + 'stool.gltf.glb', { x: -3.6, z: 0.6, s: 0.85 });

  // staircase to the rooms upstairs, against the south wall
  put(scene, colliders, D + 'stairs_wood.gltf.glb', { x: 1.8, z: 3.6, ry: -Math.PI / 2, s: 0.55, solid: true });

  // wall dressing: mounted torches by the door, a banner over the hearth
  put(scene, colliders, D + 'torch_mounted.gltf.glb', { x: 5.7, y: 1.9, z: -2.4, ry: -Math.PI / 2, s: 0.8 });
  put(scene, colliders, D + 'torch_mounted.gltf.glb', { x: 5.7, y: 1.9, z: 2.4, ry: -Math.PI / 2, s: 0.8 });

  // emissive flame tips so the candles and torches bloom
  candleFlame(scene, -4.56, 1.23, 0.2, 1.2);   // triple candle on the bar
  candleFlame(scene, 2.0, 1.12, -2.2);         // table candle by the hearth
  candleFlame(scene, 5.34, 2.32, -2.4, 1.6);   // door torches
  candleFlame(scene, 5.34, 2.32, 2.4, 1.6);
  put(scene, colliders, D + 'banner_patternA_red.gltf.glb', { x: -1, y: 1.0, z: -4.28, s: 0.6 });

  // doorstep clutter, kept clear of the spawn at (4.4, 0)
  put(scene, colliders, D + 'barrel_small.gltf.glb', { x: 5.1, z: -3.6, s: 0.7, solid: true });

  const npcStage = spawnNpcs(scene, 'inn', null);

  // The "look around" info point lives at the hearth, NOT at the bar —
  // a bar-side point sits between the player and Toblen and would always
  // out-pick him (nearest hotspot wins).
  const hotspots = [
    { kind: 'exit', id: 'exit-inn', x: 5.6, z: 0, labelY: 2.3 },
    { kind: 'location', id: locationId, x: -1, z: -2.7, labelY: 2.2 },
    ...npcStage.hotspots,
  ];

  return {
    scene, colliders,
    bounds: { minX: -5.8, maxX: 5.8, minZ: -4.3, maxZ: 4.3 },
    groundHeight: () => 0,
    hotspots,
    spawn: { x: 4.4, z: 0, yaw: Math.PI / 2 },
    tick(dt, playerPos, t) {
      npcStage.tick(dt, playerPos, t);
      fire.intensity = 14 * (1 + 0.22 * Math.sin(t * 9) + 0.13 * Math.sin(t * 23 + 1));
      flame.scale.y = 1 + 0.18 * Math.sin(t * 11);
    },
  };
}

export function buildGiant(locationId) {
  const scene = baseScene(0x0d0c0e);
  const colliders = room(scene, { w: 9, d: 7, h: 3.1, floor: 0x3a3027, wall: 0x6e5d49, beam: 0x3e3226 });
  woodFloor(scene, D + 'floor_wood_large_dark.gltf.glb', 9, 7);

  // dim, cheerless, slightly blue — no hearth here, just one tired lamp
  scene.add(new THREE.AmbientLight(0x9aa6b8, 0.32));
  const lamp = new THREE.PointLight(0xc8bfa0, 8, 14, 1.7);
  lamp.position.set(-1, 2.6, 0);
  lamp.castShadow = true;
  lamp.shadow.normalBias = 0.06;
  lamp.shadow.bias = -0.002;
  scene.add(lamp);

  // --- the bar along the back wall, Grista's crate behind it
  put(scene, colliders, D + 'table_long.gltf.glb', { x: 0, z: 2.3, ry: Math.PI / 2, sx: 0.5, sy: 0.8, sz: 1.1, solid: true });
  put(scene, colliders, D + 'box_small.gltf.glb', { x: 0, z: 3.0, s: 0.45 }); // she stands on it
  put(scene, colliders, D + 'keg.gltf.glb', { x: -2.4, z: 3.0, ry: 0.3, s: 0.5, solid: true });
  put(scene, colliders, D + 'shelves.gltf.glb', { x: 1.6, z: 3.43, ry: Math.PI, s: 0.8 });
  // bar top: one guttered candle and cheap bottles — no food here
  put(scene, colliders, D + 'candle_melted.gltf.glb', { x: 0.9, y: 0.8, z: 2.3, s: 0.55 });
  put(scene, colliders, D + 'bottle_C_brown.gltf.glb', { x: -0.9, y: 0.8, z: 2.4, s: 0.5 });
  put(scene, colliders, D + 'bottle_B_green.gltf.glb', { x: -1.4, y: 0.8, z: 2.2, s: 0.45 });
  candleFlame(scene, 0.9, 1.14, 2.3, 0.9);     // guttered bar candle

  // --- shabby seating: one broken table, one bare table, a tipped stool
  put(scene, colliders, D + 'table_medium_broken.gltf.glb', { x: -2.4, z: 0.4, ry: 0.5, s: 0.75, solid: true });
  put(scene, colliders, D + 'table_small.gltf.glb', { x: 2.4, z: -0.9, ry: 0.2, s: 0.85, solid: true });
  put(scene, colliders, D + 'candle_lit.gltf.glb', { x: 2.4, y: 0.85, z: -0.9, s: 0.4 });
  candleFlame(scene, 2.4, 1.21, -0.9, 0.9);    // lone table candle
  put(scene, colliders, D + 'stool.gltf.glb', { x: 3.3, z: -1.3, s: 0.85 });
  put(scene, colliders, D + 'stool.gltf.glb', { x: 2.0, z: -1.9, s: 0.85 });
  put(scene, colliders, D + 'stool.gltf.glb', { x: -1.5, z: -0.7, s: 0.85 });
  // tipped over where the last fight ended
  put(scene, colliders, D + 'stool.gltf.glb', { x: 0.8, y: 0.3, z: -1.8, rz: Math.PI / 2.1, s: 0.85 });

  // --- barrels and crates: more warehouse than tavern
  put(scene, colliders, D + 'barrel_small_stack.gltf.glb', { x: -3.5, z: 2.5, ry: 0.2, s: 0.75, solid: true });
  put(scene, colliders, D + 'barrel_large.gltf.glb', { x: 3.7, z: 2.5, s: 0.5, solid: true });
  put(scene, colliders, D + 'crates_stacked.gltf.glb', { x: -3.6, z: -2.4, ry: 0.4, s: 0.55, solid: true });
  // a red banner someone nailed up — the only decoration the regulars allow
  put(scene, colliders, D + 'banner_patternA_red.gltf.glb', { x: -4.28, y: 0.8, z: 0.5, ry: Math.PI / 2, s: 0.55, tint: 0x8a5a52 });

  const npcStage = spawnNpcs(scene, 'giant', null);

  // Info point by the barrel corner, clear of the bar: a point in front of
  // the bar would sit between the player and Grista and out-pick her.
  const hotspots = [
    { kind: 'exit', id: 'exit-giant', x: 0, z: -3.1, labelY: 2.2 },
    { kind: 'location', id: locationId, x: 3.6, z: 1.5, labelY: 2.0 },
    ...npcStage.hotspots,
  ];

  return {
    scene, colliders,
    bounds: { minX: -4.3, maxX: 4.3, minZ: -3.3, maxZ: 3.3 },
    groundHeight: () => 0,
    hotspots,
    spawn: { x: 0, z: -2.5, yaw: Math.PI },
    tick(dt, playerPos, t) {
      npcStage.tick(dt, playerPos, t);
      lamp.intensity = 8 * (1 + 0.1 * Math.sin(t * 7) + 0.05 * Math.sin(t * 17));
    },
  };
}
