import * as THREE from 'three';
import { locations } from '../data/locations.js';
import { placeModel, boxOf } from './assets.js';
import { mat } from './world.js';

// Town assembly from the KayKit hexagon/dungeon packs. Every model's door
// faces local +Z; cfg.rotY turns it toward its road (same convention as
// the old procedural buildings), and baseRot corrects models whose door
// is baked facing another way. Colliders are derived from each placed
// model's world-space Box3, optionally trimmed on the facing side where
// flat dressing (rails, steps) shouldn't block the player.

const G = 'assets/hexagon/buildings/green/';
const R = 'assets/hexagon/buildings/red/';
const N = 'assets/hexagon/buildings/neutral/';
const P = 'assets/hexagon/decoration/props/';
const D = 'assets/dungeon/';

const LAYOUT = {
  'stonehill-inn':       { model: G + 'building_home_B_green.gltf', scale: 9, rotY: Math.PI / 2 },
  'barthens-provisions': { model: G + 'building_market_green.gltf', scale: 6, rotY: -Math.PI / 2 },
  'lionshield-coster':   { model: G + 'building_blacksmith_green.gltf', scale: 7, rotY: Math.PI / 2 },
  'miners-exchange':     { model: G + 'building_mine_green.gltf', scale: 6, rotY: Math.PI, trimFront: 3 },
  'alderleaf-farm':      { model: G + 'building_home_A_green.gltf', scale: 7, rotY: 3 * Math.PI / 4 },
  'shrine-of-luck':      { model: G + 'building_church_green.gltf', scale: 4.5, rotY: 0 },
  'sleeping-giant':      { model: G + 'building_tavern_green.gltf', scale: 7, rotY: Math.PI, trimFront: 1.5, tint: 0xb9b1a4 },
  'townmasters-hall':    { model: G + 'building_barracks_green.gltf', scale: 5.5, rotY: -Math.PI / 2, trimFront: 1.0 },
  'tresendar-manor':     { model: N + 'building_destroyed.gltf', scale: 7.5, rotY: -Math.PI / 2 },
  'edermath-orchard':    { model: G + 'building_home_A_green.gltf', scale: 7.5, rotY: Math.PI / 2 },
};

// Dressing: solid props get a collider from their bounding box, small
// clutter (sacks, buckets) stays walk-through.
const PROPS = [
  // Alderleaf barn + working-farm clutter
  { model: R + 'building_home_A_red.gltf', x: -45, z: 31, ry: 3 * Math.PI / 4, s: 7, solid: true },
  { model: P + 'resource_lumber.gltf', x: -48.5, z: 27, ry: 0.4, s: 4.5, solid: true },
  { model: P + 'wheelbarrow.gltf', x: -41.5, z: 28, ry: 1.9, s: 4, solid: true },
  { model: P + 'sack.gltf', x: -43.4, z: 29.6, ry: 0.8, s: 5 },
  { model: P + 'crate_A_big.gltf', x: -47.2, z: 29.4, ry: 0.3, s: 4.5, solid: true },
  // Plaza: well + two canopy market stalls + clutter
  { model: G + 'building_well_green.gltf', x: -1.5, z: 2.5, ry: 0.4, s: 3.5, solid: true },
  { model: P + 'tent.gltf', x: -5.5, z: -6.2, ry: 0.3, s: 5.5, solid: true },
  { model: P + 'crate_B_big.gltf', x: -5.9, z: -6.5, ry: 0.5, s: 4.5 },
  { model: P + 'sack.gltf', x: -4.8, z: -5.6, ry: 2.1, s: 5 },
  { model: P + 'tent.gltf', x: -6.5, z: 4.8, ry: -0.5, s: 5.5, solid: true },
  { model: P + 'crate_A_small.gltf', x: -6.2, z: 4.3, ry: 1.2, s: 4.5 },
  { model: P + 'bucket_water.gltf', x: -7.1, z: 5.6, ry: 0, s: 4 },
  // Barthen's frontage (the market model bakes in its own crate spill)
  { model: P + 'barrel.gltf', x: 13.3, z: -7.4, ry: 0, s: 4.5, solid: true },
  { model: P + 'sack.gltf', x: 13.9, z: -6.4, ry: 1.4, s: 5 },
  // Lionshield Coster: arms crates and a weapon rack out front
  { model: P + 'weaponrack.gltf', x: -19.1, z: 1.9, ry: Math.PI / 2 + 0.2, s: 5, solid: true },
  { model: P + 'crate_long_empty.gltf', x: -18.7, z: 3.4, ry: 0.5, s: 4.5, solid: true },
  { model: P + 'bucket_arrows.gltf', x: -19.3, z: 8.9, ry: -1.1, s: 4.5 },
  // Miner's Exchange yard
  { model: P + 'resource_stone.gltf', x: 17.8, z: 25.6, ry: 0.7, s: 4.5, solid: true },
  { model: P + 'wheelbarrow.gltf', x: 10.6, z: 26.2, ry: 2.4, s: 4, solid: true },
  // Sleeping Giant: rundown spill of barrels and broken stone
  { model: P + 'barrel.gltf', x: 35.1, z: 8.3, ry: 0, s: 4.5, solid: true },
  { model: P + 'barrel.gltf', x: 34.5, z: 9.4, ry: 0.9, s: 4.2, solid: true },
  { model: P + 'crate_open.gltf', x: 45.1, z: 8.8, ry: 0.6, s: 4.5, solid: true },
  { model: D + 'rubble_half.gltf.glb', x: 45.6, z: 10.8, ry: 1.8, s: 0.4 },
  // Stonehill Inn doorstep clutter
  { model: P + 'barrel.gltf', x: -4.3, z: -15.4, ry: 0, s: 4.5, solid: true },
  { model: P + 'crate_A_small.gltf', x: -4.7, z: -16.5, ry: 0.7, s: 4.5 },
  // Edermath cottage
  { model: P + 'bucket_water.gltf', x: -55.4, z: -41.6, ry: 0, s: 4 },
  { model: P + 'crate_A_small.gltf', x: -60.6, z: -40.8, ry: 0.4, s: 4.5 },
  // Tresendar Manor: scattered ruined walls on the hill (dungeon pack)
  { model: D + 'rubble_large.gltf.glb', x: 72, z: -8, ry: 0.7, s: 0.55, solid: true },
  { model: D + 'wall_broken.gltf.glb', x: 84, z: -10, ry: 0.6, s: 0.8, solid: true },
  { model: D + 'wall_half.gltf.glb', x: 74, z: -20, ry: -0.9, s: 0.75, solid: true },
  { model: D + 'wall_half.gltf.glb', x: 70.5, z: -15.5, ry: 1.9, s: 0.7, solid: true },
  { model: D + 'pillar.gltf.glb', x: 83, z: -19, ry: 0, s: 0.7, solid: true },
  { model: D + 'rubble_half.gltf.glb', x: 76, z: -7.2, ry: 2.6, s: 0.45 },
  // Grain fields inside the farm fence (flat hex slabs, sunk to grade)
  { model: N + 'building_grain.gltf', x: -44.5, z: 47.8, ry: 0.3, s: 5, sink: 1.2 },
  { model: N + 'building_grain.gltf', x: -38.6, z: 48.4, ry: 1.6, s: 5, sink: 1.2 },
];

export const TOWN_MODELS = [
  ...Object.values(LAYOUT).map((c) => c.model),
  ...PROPS.map((p) => p.model),
];

// Sample the terrain under the footprint and rest the model on the lowest
// point (plus a small sink) so no plinth corner floats on a slope.
function settle(obj, box, groundHeight, sink) {
  let y = Infinity;
  const p = obj.position;
  for (const [x, z] of [
    [p.x, p.z],
    [box.min.x, box.min.z], [box.min.x, box.max.z],
    [box.max.x, box.min.z], [box.max.x, box.max.z],
  ]) {
    y = Math.min(y, groundHeight(x, z));
  }
  obj.position.y = y - sink;
  return obj.position.y;
}

// Distance from (x, z) to the collider edge along the facing direction.
function exitDistance(col, x, z, dx, dz) {
  let t = Infinity;
  if (dx > 1e-6) t = Math.min(t, (col.maxX - x) / dx);
  else if (dx < -1e-6) t = Math.min(t, (col.minX - x) / dx);
  if (dz > 1e-6) t = Math.min(t, (col.maxZ - z) / dz);
  else if (dz < -1e-6) t = Math.min(t, (col.minZ - z) / dz);
  return Number.isFinite(t) ? Math.max(t, 1) : 1;
}

function trimFacingSide(col, dx, dz, amount) {
  if (dx > 0.5) col.maxX -= amount;
  else if (dx < -0.5) col.minX += amount;
  if (dz > 0.5) col.maxZ -= amount;
  else if (dz < -0.5) col.minZ += amount;
}

function makeNoticeBoard() {
  const g = new THREE.Group();
  for (const px of [-0.8, 0.8]) {
    const post = new THREE.Mesh(new THREE.BoxGeometry(0.14, 2.3, 0.14), mat(0x5a4632));
    post.position.set(px, 1.15, 0);
    g.add(post);
  }
  const board = new THREE.Mesh(new THREE.BoxGeometry(2.0, 1.2, 0.08), mat(0x7a5c3a));
  board.position.set(0, 1.7, 0);
  board.castShadow = true;
  g.add(board);
  const paper = mat(0xf0e3c4, { emissive: 0xf0e3c4, emissiveIntensity: 0.15 });
  for (const [px, py, s] of [[-0.55, 1.75, 1], [0.1, 1.6, 0.8], [0.6, 1.8, 0.9]]) {
    const p = new THREE.Mesh(new THREE.BoxGeometry(0.34, 0.46, 0.02), paper);
    p.position.set(px, py, 0.06);
    p.scale.setScalar(s);
    p.rotation.z = (px * 17 % 1) * 0.2 - 0.1;
    g.add(p);
  }
  return g;
}

export function assembleTown(scene, groundHeight) {
  const colliders = [];
  const hotspots = [];

  for (const loc of locations) {
    const cfg = LAYOUT[loc.id];
    const [x, z] = loc.position;

    const obj = placeModel(scene, cfg.model, {
      x, y: 0, z,
      rotY: cfg.rotY + (cfg.baseRot || 0),
      scale: cfg.scale,
      tint: cfg.tint || null,
    });
    const box = boxOf(obj);
    settle(obj, box, groundHeight, cfg.sink ?? 0.12);
    box.setFromObject(obj); // re-measure after settling for labelY

    const col = { minX: box.min.x, maxX: box.max.x, minZ: box.min.z, maxZ: box.max.z };
    const dirX = Math.sin(cfg.rotY), dirZ = Math.cos(cfg.rotY);
    if (cfg.trimFront) trimFacingSide(col, dirX, dirZ, cfg.trimFront);
    colliders.push(col);

    // door hotspot, 1.2m out from the facing edge
    const t = exitDistance(col, x, z, dirX, dirZ);
    hotspots.push({
      kind: loc.interior ? 'enter' : 'location',
      id: loc.id,
      x: x + dirX * (t + 1.2),
      z: z + dirZ * (t + 1.2),
      labelY: box.max.y + 0.6,
      enterYaw: cfg.rotY,            // walking in: face the building
      exitYaw: cfg.rotY + Math.PI,   // walking out: face away
    });
  }

  for (const p of PROPS) {
    const obj = placeModel(scene, p.model, {
      x: p.x, y: 0, z: p.z, rotY: p.ry || 0, scale: p.s,
    });
    const box = boxOf(obj);
    settle(obj, box, groundHeight, p.sink ?? 0.02);
    if (p.solid) {
      colliders.push({
        minX: box.min.x - 0.05, maxX: box.max.x + 0.05,
        minZ: box.min.z - 0.05, maxZ: box.max.z + 0.05,
      });
    }
  }

  // town notice board on the plaza (kept procedural: readable paper sheets)
  const board = makeNoticeBoard();
  board.position.set(6.6, groundHeight(6.6, 9.4), 9.4);
  board.rotation.y = -Math.PI / 2 - 0.3;
  scene.add(board);
  colliders.push({ minX: 6.0, maxX: 7.2, minZ: 8.4, maxZ: 10.4 });

  return { colliders, hotspots };
}
