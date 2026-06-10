import * as THREE from 'three';
import { mat } from './world.js';
import { spawnNpcs } from './npcs.js';

// Walk-in interiors for the Stonehill Inn and the Sleeping Giant.
// Each returns a self-contained "stage": its own scene, colliders,
// hotspots (exit door, bar info point, NPCs), spawn point, and tick.

function room(scene, { w, d, h, floor, wall, beam }) {
  const colliders = [];
  const floorMesh = new THREE.Mesh(new THREE.BoxGeometry(w + 1, 0.3, d + 1), mat(floor));
  floorMesh.position.y = -0.15;
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

function table(scene, colliders, x, z, { tilt = 0, stools = 3 } = {}) {
  const top = new THREE.Mesh(new THREE.CylinderGeometry(0.62, 0.62, 0.07, 8), mat(0x6e4a2e));
  top.position.set(x, 0.78, z);
  top.rotation.x = tilt;
  top.castShadow = true;
  scene.add(top);
  const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.13, 0.78, 6), mat(0x52402c));
  leg.position.set(x, 0.39, z);
  scene.add(leg);
  for (let i = 0; i < stools; i++) {
    const a = (i / stools) * Math.PI * 2 + x + z;
    const sx = x + Math.cos(a) * 1.05, sz = z + Math.sin(a) * 1.05;
    const stool = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.26, 0.5, 6), mat(0x7a5c3a));
    stool.position.set(sx, 0.25, sz);
    stool.castShadow = true;
    scene.add(stool);
  }
  colliders.push({ minX: x - 0.7, maxX: x + 0.7, minZ: z - 0.7, maxZ: z + 0.7 });
  // candle
  const candle = new THREE.Mesh(
    new THREE.CylinderGeometry(0.04, 0.04, 0.16, 5),
    mat(0xfff3c4, { emissive: 0xffc24d, emissiveIntensity: 1.2 })
  );
  candle.position.set(x + 0.15, 0.9, z);
  candle.rotation.x = tilt;
  scene.add(candle);
}

function bar(scene, colliders, { x = 0, z = 0, len = 5, along = 'z' } = {}) {
  const geo = along === 'z'
    ? new THREE.BoxGeometry(1.0, 1.1, len)
    : new THREE.BoxGeometry(len, 1.1, 1.0);
  const counter = new THREE.Mesh(geo, mat(0x5c4430));
  counter.position.set(x, 0.55, z);
  counter.castShadow = true;
  scene.add(counter);
  const slabGeo = along === 'z'
    ? new THREE.BoxGeometry(1.25, 0.08, len + 0.25)
    : new THREE.BoxGeometry(len + 0.25, 0.08, 1.25);
  const slab = new THREE.Mesh(slabGeo, mat(0x6e4a2e));
  slab.position.set(x, 1.14, z);
  scene.add(slab);
  if (along === 'z') colliders.push({ minX: x - 0.7, maxX: x + 0.7, minZ: z - len / 2, maxZ: z + len / 2 });
  else colliders.push({ minX: x - len / 2, maxX: x + len / 2, minZ: z - 0.7, maxZ: z + 0.7 });
}

function shelves(scene, x, z, len, along = 'z') {
  const bottleColors = [0x6b8e5a, 0x8c5a2f, 0x4a6a8c, 0x9b3b3b, 0xb8862d];
  for (const y of [1.5, 2.1]) {
    const geo = along === 'z'
      ? new THREE.BoxGeometry(0.35, 0.06, len)
      : new THREE.BoxGeometry(len, 0.06, 0.35);
    const shelf = new THREE.Mesh(geo, mat(0x52402c));
    shelf.position.set(x, y, z);
    scene.add(shelf);
    for (let i = 0; i < 6; i++) {
      const o = -len / 2 + 0.4 + (i * (len - 0.8)) / 5;
      const bottle = new THREE.Mesh(
        new THREE.CylinderGeometry(0.06, 0.07, 0.3, 5),
        mat(bottleColors[(i + (y === 2.1 ? 2 : 0)) % bottleColors.length])
      );
      bottle.position.set(along === 'z' ? x : x + o, y + 0.18, along === 'z' ? z + o : z);
      scene.add(bottle);
    }
  }
}

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
    mat(0xff9a3c, { emissive: 0xff7a1a, emissiveIntensity: 2.2 })
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

function baseScene(bg) {
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(bg);
  return scene;
}

export function buildInn(locationId) {
  const scene = baseScene(0x14100a);
  const colliders = room(scene, { w: 12, d: 9, h: 3.4, floor: 0x7a5c3a, wall: 0xc9b08a, beam: 0x52402c });

  scene.add(new THREE.AmbientLight(0xffd9a8, 0.34));
  const lamp = new THREE.PointLight(0xffc685, 20, 18, 1.6);
  lamp.position.set(0, 2.9, 0);
  lamp.castShadow = true;
  scene.add(lamp);

  bar(scene, colliders, { x: -4.6, z: 0, len: 5.5, along: 'z' });
  shelves(scene, -5.8, 0, 4.5, 'z');
  const { flame, fire } = hearth(scene, colliders, -1, -4.2, 0);

  table(scene, colliders, 2.2, -2.2);
  table(scene, colliders, 2.4, 2.3);
  table(scene, colliders, -1.2, 2.6);
  table(scene, colliders, 4.2, 0.2, { stools: 2 });

  // staircase to the rooms, against the south wall
  for (let i = 0; i < 5; i++) {
    const step = new THREE.Mesh(new THREE.BoxGeometry(0.9, 0.36 * (i + 1), 0.6), mat(0x6e4a2e));
    step.position.set(0.6 + i * 0.6, 0.18 * (i + 1), 3.9);
    scene.add(step);
  }
  colliders.push({ minX: 0.2, maxX: 3.6, minZ: 3.4, maxZ: 4.5 });

  // rug by the hearth
  const rug = new THREE.Mesh(new THREE.BoxGeometry(2.6, 0.04, 1.8), mat(0x8c2f2f));
  rug.position.set(-1, 0.02, -2.6);
  rug.receiveShadow = true;
  scene.add(rug);

  const npcStage = spawnNpcs(scene, 'inn', null);

  const hotspots = [
    { kind: 'exit', id: 'exit-inn', x: 5.6, z: 0, labelY: 2.3 },
    { kind: 'location', id: locationId, x: -3.6, z: 0, labelY: 2.0 },
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
  const scene = baseScene(0x100d0a);
  const colliders = room(scene, { w: 9, d: 7, h: 3.1, floor: 0x564231, wall: 0x6e5d49, beam: 0x3e3226 });

  // dim, cheerless light
  scene.add(new THREE.AmbientLight(0xb8c4cc, 0.22));
  const lamp = new THREE.PointLight(0xd9c49a, 9, 14, 1.7);
  lamp.position.set(-1, 2.6, 0);
  lamp.castShadow = true;
  scene.add(lamp);

  bar(scene, colliders, { x: 0, z: 2.3, len: 5, along: 'x' });
  shelves(scene, 0, 3.3, 3.5, 'x');

  table(scene, colliders, -2.2, 0.6, { tilt: 0.04, stools: 2 });
  table(scene, colliders, 2.4, -0.9, { tilt: -0.05, stools: 2 });

  // a broken stool on its side
  const broken = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.26, 0.5, 6), mat(0x7a5c3a));
  broken.position.set(0.8, 0.25, -1.8);
  broken.rotation.z = Math.PI / 2.1;
  scene.add(broken);

  // barrel stack in the corner
  const barrelGeo = new THREE.CylinderGeometry(0.4, 0.36, 0.95, 8);
  for (const [bx, bz, by] of [[-3.6, 2.5, 0.48], [-2.8, 2.7, 0.48], [-3.2, 2.6, 1.4]]) {
    const b = new THREE.Mesh(barrelGeo, mat(0x7a5c3a));
    b.position.set(bx, by, bz);
    b.castShadow = true;
    scene.add(b);
  }
  colliders.push({ minX: -4.2, maxX: -2.3, minZ: 2.0, maxZ: 3.3 });

  // Grista's crate — she's a dwarf and the bar would swallow her whole
  const crate = new THREE.Mesh(new THREE.BoxGeometry(0.8, 0.45, 0.8), mat(0x52402c));
  crate.position.set(0, 0.225, 3.0);
  scene.add(crate);

  const npcStage = spawnNpcs(scene, 'giant', null);

  const hotspots = [
    { kind: 'exit', id: 'exit-giant', x: 0, z: -3.1, labelY: 2.2 },
    { kind: 'location', id: locationId, x: 0, z: 1.9, labelY: 2.0 },
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
      lamp.intensity = 9 * (1 + 0.1 * Math.sin(t * 7));
    },
  };
}
