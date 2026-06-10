import * as THREE from 'three';
import { locations } from '../data/locations.js';
import { mat } from './world.js';

// Procedural low-poly buildings. Every building faces local +Z; the
// assembly table rotates it toward its road. Door hotspots are computed
// from that same facing so labels and interactions line up with the door.

function gableRoof(w, d, h, color) {
  const hw = w / 2, hd = d / 2;
  const v = [
    // south slope
    -hw, 0, hd, hw, 0, hd, hw, h, 0,
    -hw, 0, hd, hw, h, 0, -hw, h, 0,
    // north slope
    hw, 0, -hd, -hw, 0, -hd, -hw, h, 0,
    hw, 0, -hd, -hw, h, 0, hw, h, 0,
    // east gable
    hw, 0, hd, hw, 0, -hd, hw, h, 0,
    // west gable
    -hw, 0, -hd, -hw, 0, hd, -hw, h, 0,
    // underside of the eaves
    hw, 0, hd, -hw, 0, hd, -hw, 0, -hd,
    hw, 0, hd, -hw, 0, -hd, hw, 0, -hd,
  ];
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(v, 3));
  geo.computeVertexNormals();
  const mesh = new THREE.Mesh(geo, mat(color));
  mesh.castShadow = true;
  return mesh;
}

function addWindows(g, w, d, wallH, stories) {
  const winMat = mat(0xffd98a, { emissive: 0xffb84d, emissiveIntensity: 0.45 });
  const geo = new THREE.BoxGeometry(0.7, 0.9, 0.1);
  const rows = stories === 2 ? [1.6, 4.2] : [1.6];
  for (const y of rows) {
    for (const fz of [-1, 1]) {
      for (const x of [-w / 4, w / 4]) {
        const win = new THREE.Mesh(geo, winMat);
        win.position.set(x, y, fz * (d / 2 + 0.02));
        g.add(win);
      }
    }
    for (const sx of [-1, 1]) {
      const win = new THREE.Mesh(geo, winMat);
      win.rotation.y = Math.PI / 2;
      win.position.set(sx * (w / 2 + 0.02), y, 0);
      g.add(win);
    }
  }
}

function addTimberFrame(g, w, d, wallH, stories) {
  const beam = mat(0x52402c);
  for (const sx of [-1, 1]) {
    for (const sz of [-1, 1]) {
      const post = new THREE.Mesh(new THREE.BoxGeometry(0.28, wallH + 0.4, 0.28), beam);
      post.position.set(sx * (w / 2 - 0.02), wallH / 2 - 0.2, sz * (d / 2 - 0.02));
      g.add(post);
    }
  }
  const bands = stories === 2 ? [2.7, wallH - 0.15] : [wallH - 0.15];
  for (const y of bands) {
    const bandX = new THREE.Mesh(new THREE.BoxGeometry(w + 0.1, 0.22, 0.16), beam);
    for (const sz of [-1, 1]) {
      const b = bandX.clone();
      b.position.set(0, y, sz * (d / 2 + 0.02));
      g.add(b);
    }
    const bandZ = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.22, d + 0.1), beam);
    for (const sx of [-1, 1]) {
      const b = bandZ.clone();
      b.position.set(sx * (w / 2 + 0.02), y, 0);
      g.add(b);
    }
  }
}

function makeBuilding({
  w = 8, d = 6, stories = 1, wall = 0xa0764e, roof = 0x7c6a4f,
  chimney = false, sign = null, lean = 0,
}) {
  const g = new THREE.Group();
  const wallH = stories * 2.7;

  const walls = new THREE.Mesh(new THREE.BoxGeometry(w, wallH + 0.5, d), mat(wall));
  walls.position.y = wallH / 2 - 0.25;
  walls.castShadow = walls.receiveShadow = true;
  g.add(walls);

  const roofH = Math.max(1.4, d * 0.42);
  const roofMesh = gableRoof(w + 0.9, d + 1.1, roofH, roof);
  roofMesh.position.y = wallH - 0.02;
  g.add(roofMesh);

  // door with a stone step, on the +Z face
  const door = new THREE.Mesh(new THREE.BoxGeometry(1.15, 2.1, 0.12), mat(0x4a3018));
  door.position.set(0, 1.05, d / 2 + 0.04);
  g.add(door);
  const step = new THREE.Mesh(new THREE.BoxGeometry(1.6, 0.22, 0.9), mat(0x9b9385));
  step.position.set(0, 0.05, d / 2 + 0.45);
  g.add(step);

  addWindows(g, w, d, wallH, stories);
  addTimberFrame(g, w, d, wallH, stories);

  // little awning over the door
  const awning = gableRoof(2.0, 1.2, 0.5, roof);
  awning.position.set(0, 2.45, d / 2 + 0.45);
  g.add(awning);

  if (chimney) {
    const ch = new THREE.Mesh(new THREE.BoxGeometry(0.7, roofH + 1.6, 0.7), mat(0x8d8678));
    ch.position.set(w / 4, wallH + roofH / 2 + 0.3, -d / 6);
    ch.castShadow = true;
    g.add(ch);
  }

  if (sign) {
    const post = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.09, 2.5, 5), mat(0x5a4632));
    post.position.set(w / 2 - 0.6, 1.25, d / 2 + 0.9);
    g.add(post);
    const arm = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.08, 0.9), mat(0x5a4632));
    arm.position.set(w / 2 - 0.6, 2.4, d / 2 + 1.2);
    g.add(arm);
    const board = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.7, 0.95), mat(sign));
    board.position.set(w / 2 - 0.6, 1.95, d / 2 + 1.3);
    g.add(board);
  }

  if (lean) g.rotation.z = lean;
  return g;
}

function makeShrine() {
  const g = new THREE.Group();
  const plinth = new THREE.Mesh(new THREE.BoxGeometry(1.6, 1.1, 1.6), mat(0x9b9385));
  plinth.position.y = 0.55;
  plinth.castShadow = true;
  g.add(plinth);
  const statue = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.26, 1.0, 6), mat(0xb8862d));
  statue.position.y = 1.6;
  g.add(statue);
  const head = new THREE.Mesh(new THREE.SphereGeometry(0.22, 6, 5), mat(0xb8862d));
  head.position.y = 2.25;
  g.add(head);
  for (const [px, pz] of [[-1.1, -1.1], [1.1, -1.1], [-1.1, 1.1], [1.1, 1.1]]) {
    const post = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.11, 2.6, 5), mat(0x7a5c3a));
    post.position.set(px, 1.3, pz);
    g.add(post);
  }
  const canopy = gableRoof(3.4, 3.4, 1.0, 0x5e718a);
  canopy.position.y = 2.6;
  g.add(canopy);
  const candleMat = mat(0xfff3c4, { emissive: 0xffc24d, emissiveIntensity: 0.9 });
  for (const cx of [-0.5, 0.5]) {
    const candle = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, 0.25, 5), candleMat);
    candle.position.set(cx, 1.25, 0.55);
    g.add(candle);
  }
  return g;
}

function makeRuin() {
  const g = new THREE.Group();
  const stone = 0x8d8678;
  const slab = new THREE.Mesh(new THREE.BoxGeometry(14, 0.5, 10), mat(0x9b9385));
  slab.position.y = 0.1;
  slab.receiveShadow = true;
  g.add(slab);
  const walls = [
    // [x, z, w(along x), d(along z), h]
    [0, -4.8, 13.6, 0.6, 3.1],         // back wall
    [-4.5, 4.8, 4.4, 0.6, 1.7],        // front left
    [5.0, 4.8, 3.4, 0.6, 0.9],         // front right (entrance gap between)
    [-6.8, -1.5, 0.6, 6.0, 2.4],       // west wall, partial
    [6.8, 1.0, 0.6, 7.0, 1.3],         // east wall, crumbled low
  ];
  for (const [x, z, w, d, h] of walls) {
    const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat(stone));
    m.position.set(x, h / 2 + 0.3, z);
    m.castShadow = m.receiveShadow = true;
    g.add(m);
  }
  const tower = new THREE.Mesh(new THREE.BoxGeometry(2.8, 5.6, 2.8), mat(stone));
  tower.position.set(-5.4, 3.1, -3.4);
  tower.castShadow = true;
  g.add(tower);
  const rubbleGeo = new THREE.IcosahedronGeometry(0.55, 0);
  for (const [x, z, s] of [[2, 3, 1], [-2, 5.8, 0.8], [6, 5.6, 1.2], [0, -1, 0.9], [-4, 1, 0.7], [7.6, 4, 0.8]]) {
    const r = new THREE.Mesh(rubbleGeo, mat(0x9b9385));
    r.position.set(x, 0.45, z);
    r.scale.setScalar(s);
    g.add(r);
  }
  return g;
}

// --- town props ---
function makeCrates() {
  const g = new THREE.Group();
  for (const [x, z, s, ry] of [[0, 0, 1, 0.2], [1.1, 0.3, 0.8, 0.9], [0.4, 0, 0.7, 0.5]]) {
    const c = new THREE.Mesh(new THREE.BoxGeometry(0.9, 0.9, 0.9), mat(0xb08a5e));
    c.position.set(x, 0.45 * s + (x === 0.4 ? 0.9 : 0), z);
    c.scale.setScalar(s);
    c.rotation.y = ry;
    c.castShadow = true;
    g.add(c);
  }
  return g;
}

function makeBarrels() {
  const g = new THREE.Group();
  const geo = new THREE.CylinderGeometry(0.42, 0.36, 1.0, 8);
  for (const [x, z] of [[0, 0], [0.95, 0.2], [0.4, 0.85]]) {
    const b = new THREE.Mesh(geo, mat(0x7a5c3a));
    b.position.set(x, 0.5, z);
    b.castShadow = true;
    g.add(b);
  }
  return g;
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

function makeOreCart() {
  const g = new THREE.Group();
  const body = new THREE.Mesh(new THREE.BoxGeometry(1.8, 0.8, 1.1), mat(0x6e4a2e));
  body.position.y = 0.85;
  body.castShadow = true;
  g.add(body);
  const wheelGeo = new THREE.CylinderGeometry(0.45, 0.45, 0.12, 8);
  wheelGeo.rotateZ(Math.PI / 2);
  for (const [x, z] of [[-0.6, -0.6], [0.6, -0.6], [-0.6, 0.6], [0.6, 0.6]]) {
    const wh = new THREE.Mesh(wheelGeo, mat(0x4a3018));
    wh.position.set(x, 0.45, z);
    g.add(wh);
  }
  for (const [x, z] of [[-0.4, 0], [0.2, 0.2], [0.1, -0.25]]) {
    const ore = new THREE.Mesh(new THREE.IcosahedronGeometry(0.28, 0), mat(0x6b6b75));
    ore.position.set(x, 1.35, z);
    g.add(ore);
  }
  return g;
}

function makeWell() {
  const g = new THREE.Group();
  const ring = new THREE.Mesh(new THREE.CylinderGeometry(1.0, 1.1, 0.9, 8, 1, true), mat(0x9b9385, { side: THREE.DoubleSide }));
  ring.position.y = 0.45;
  ring.castShadow = true;
  g.add(ring);
  for (const px of [-0.9, 0.9]) {
    const post = new THREE.Mesh(new THREE.BoxGeometry(0.12, 1.9, 0.12), mat(0x5a4632));
    post.position.set(px, 0.95, 0);
    g.add(post);
  }
  const roof = gableRoof(2.6, 1.6, 0.7, 0x7a4a2f);
  roof.position.y = 1.9;
  g.add(roof);
  const bucket = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.13, 0.24, 6), mat(0x7a5c3a));
  bucket.position.set(0, 1.2, 0);
  g.add(bucket);
  return g;
}

// --- assembly table: id → shape ---
const LAYOUT = {
  'stonehill-inn': { w: 10, d: 8, stories: 2, wall: 0xc9b08a, roof: 0xa8442e, chimney: true, sign: 0xb8862d, rotY: Math.PI / 2 },
  'barthens-provisions': { w: 10, d: 7, wall: 0xa0764e, roof: 0x7c6a4f, sign: 0x8a7a52, rotY: -Math.PI / 2 },
  'lionshield-coster': { w: 8, d: 6, wall: 0x8f7a5a, roof: 0x5e718a, sign: 0x3f5570, rotY: Math.PI / 2 },
  'miners-exchange': { w: 9, d: 7, wall: 0x9c8d6b, roof: 0x6b5a44, chimney: true, rotY: Math.PI },
  'alderleaf-farm': { w: 6, d: 5, wall: 0xb08a5e, roof: 0xab8a4c, chimney: true, rotY: 3 * Math.PI / 4 },
  'shrine-of-luck': { shrine: true, rotY: 0 },
  'sleeping-giant': { w: 8, d: 6, wall: 0x8a7560, roof: 0x6e5d49, sign: 0x6e5d49, lean: 0.035, rotY: Math.PI },
  'townmasters-hall': { w: 10, d: 8, wall: 0xa39a85, roof: 0x7a4a2f, chimney: true, rotY: -Math.PI / 2 },
  'tresendar-manor': { ruin: true, w: 14, d: 10, rotY: -Math.PI / 2 },
  'edermath-orchard': { w: 6, d: 5, wall: 0xb08a5e, roof: 0x96703f, chimney: true, rotY: Math.PI / 2 },
};

function footprintAABB(x, z, w, d, rotY, pad = 0.2) {
  const c = Math.abs(Math.cos(rotY)), s = Math.abs(Math.sin(rotY));
  const hx = (w / 2) * c + (d / 2) * s + pad;
  const hz = (w / 2) * s + (d / 2) * c + pad;
  return { minX: x - hx, maxX: x + hx, minZ: z - hz, maxZ: z + hz };
}

export function assembleTown(scene, groundHeight) {
  const colliders = [];
  const hotspots = [];

  for (const loc of locations) {
    const cfg = LAYOUT[loc.id];
    const [x, z] = loc.position;
    const gy = groundHeight(x, z);

    let g;
    if (cfg.shrine) g = makeShrine();
    else if (cfg.ruin) g = makeRuin();
    else g = makeBuilding(cfg);
    g.position.set(x, gy, z);
    g.rotation.y = cfg.rotY;
    scene.add(g);

    if (cfg.shrine) {
      colliders.push({ minX: x - 1.1, maxX: x + 1.1, minZ: z - 1.1, maxZ: z + 1.1 });
    } else {
      colliders.push(footprintAABB(x, z, cfg.w, cfg.d, cfg.rotY));
    }

    // door hotspot, 1.2m out from the facing wall
    const depth = cfg.shrine ? 1.6 : cfg.d;
    const dirX = Math.sin(cfg.rotY), dirZ = Math.cos(cfg.rotY);
    const hx = x + dirX * (depth / 2 + 1.2);
    const hz = z + dirZ * (depth / 2 + 1.2);
    const wallH = cfg.ruin ? 3.5 : cfg.shrine ? 3.0 : (cfg.stories || 1) * 2.7 + Math.max(1.4, cfg.d * 0.42);
    hotspots.push({
      kind: loc.interior ? 'enter' : 'location',
      id: loc.id,
      x: hx, z: hz,
      labelY: gy + wallH + 0.6,
      enterYaw: cfg.rotY,            // walking in: face the building
      exitYaw: cfg.rotY + Math.PI,   // walking out: face away
    });
  }

  // props
  const gh = groundHeight;
  const props = [
    { make: makeBuilding, args: { w: 7, d: 5, wall: 0x8a5a35, roof: 0x6e4a2e }, x: -45, z: 31, ry: 3 * Math.PI / 4, collideW: 7, collideD: 5 },  // Alderleaf barn
    { make: makeCrates, x: 14, z: -8.5, ry: 0.3, collideW: 2.4, collideD: 2 },
    { make: makeBarrels, x: 36.3, z: 9.6, ry: 0, collideW: 2, collideD: 2 },
    { make: makeNoticeBoard, x: 6.6, z: 9.4, ry: -Math.PI / 2 - 0.3, collideW: 0.6, collideD: 2 },
    { make: makeOreCart, x: 18.5, z: 27.5, ry: 0.5, collideW: 2.2, collideD: 1.6 },
    { make: makeWell, x: -1.5, z: 2.5, ry: 0.4, collideW: 2.4, collideD: 2.4 },
  ];
  for (const p of props) {
    const g = p.args ? p.make(p.args) : p.make();
    g.position.set(p.x, gh(p.x, p.z), p.z);
    g.rotation.y = p.ry;
    scene.add(g);
    colliders.push(footprintAABB(p.x, p.z, p.collideW, p.collideD, p.ry, 0.1));
  }

  return { colliders, hotspots };
}
