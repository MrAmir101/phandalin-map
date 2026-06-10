import * as THREE from 'three';

// Terrain, roads, vegetation, lighting, fog, and the manor hill.
// Exposes groundHeight(x, z) so the player, buildings, and NPCs all
// stand on the same surface.

export const BOUNDS = { minX: -100, maxX: 100, minZ: -95, maxZ: 95 };

const HILL = { x: 78, z: -8, radius: 32, height: 4.2 };

export function groundHeight(x, z) {
  const d = Math.hypot(x - HILL.x, z - HILL.z);
  let h = 0;
  if (d < HILL.radius) {
    const t = 1 - d / HILL.radius;
    h += HILL.height * t * t * (3 - 2 * t);
  }
  h += 0.35 * Math.sin(x * 0.13) * Math.sin(z * 0.17);
  return h;
}

// --- deterministic rng so the town looks the same every visit ---
function mulberry32(seed) {
  let a = seed;
  return () => {
    a |= 0; a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// --- roads, defined as polylines painted onto the terrain ---
const ROADS = [
  { w: 3.0, pts: [[-85, -70], [-55, -50], [-28, -26], [-12, -10], [0, 0]] },  // Triboar Trail (NW)
  { w: 3.0, pts: [[0, 0], [1, 18], [0, 34], [2, 52], [0, 68]] },              // south road
  { w: 2.8, pts: [[0, 0], [14, 3], [28, 7], [40, 9], [52, 6], [64, -2], [74, -9]] }, // east road, up the hill
  { w: 1.8, pts: [[-2, -6], [-5.5, -12]] },          // spur: inn
  { w: 1.8, pts: [[3, -3], [13, -12]] },             // spur: Barthen's
  { w: 1.8, pts: [[-6, 1], [-19, 4]] },              // spur: Lionshield
  { w: 1.8, pts: [[5, 3], [8, 6]] },                 // spur: hall
  { w: 1.8, pts: [[1, -7], [4, -22]] },              // spur: shrine
  { w: 1.8, pts: [[0, 28], [14, 28]] },              // spur: exchange
  { w: 2.0, pts: [[0, 40], [-30, 38]] },             // spur: farm
  { w: 2.0, pts: [[-28, -26], [-44, -40]] },         // spur: orchard
];

function distToSegment(px, pz, ax, az, bx, bz) {
  const dx = bx - ax, dz = bz - az;
  const len2 = dx * dx + dz * dz || 1e-9;
  let t = ((px - ax) * dx + (pz - az) * dz) / len2;
  t = Math.max(0, Math.min(1, t));
  return Math.hypot(px - (ax + dx * t), pz - (az + dz * t));
}

export function roadDistance(x, z) {
  let best = Infinity;
  for (const road of ROADS) {
    for (let i = 0; i < road.pts.length - 1; i++) {
      const [ax, az] = road.pts[i];
      const [bx, bz] = road.pts[i + 1];
      const d = distToSegment(x, z, ax, az, bx, bz) - (road.w - 2.8); // wider roads count closer
      if (d < best) best = d;
    }
  }
  best = Math.min(best, Math.hypot(x, z) - 8.5 + 2.8); // plaza disc
  return best;
}

const matCache = new Map();
export function mat(color, extra = {}) {
  const key = color + JSON.stringify(extra);
  if (!matCache.has(key)) {
    matCache.set(key, new THREE.MeshStandardMaterial({
      color, flatShading: true, roughness: 1, metalness: 0, ...extra,
    }));
  }
  return matCache.get(key);
}

function buildTerrain() {
  const geo = new THREE.PlaneGeometry(280, 240, 140, 120);
  geo.rotateX(-Math.PI / 2);
  const pos = geo.attributes.position;
  const colors = new Float32Array(pos.count * 3);
  const grassA = new THREE.Color(0x8fae6a);
  const grassB = new THREE.Color(0x7c9c58);
  const dirt = new THREE.Color(0xc9ad7e);
  const dirtB = new THREE.Color(0xbb9e6e);
  const c = new THREE.Color();
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i), z = pos.getZ(i);
    pos.setY(i, groundHeight(x, z));
    const n = Math.abs(Math.sin(x * 12.9898 + z * 78.233) * 43758.5453) % 1;
    const onRoad = roadDistance(x, z) < 2.8 + (n - 0.5) * 1.4;
    if (onRoad) c.lerpColors(dirt, dirtB, n);
    else c.lerpColors(grassA, grassB, n);
    colors[i * 3] = c.r; colors[i * 3 + 1] = c.g; colors[i * 3 + 2] = c.b;
  }
  geo.setAttribute('color', new THREE.BufferAttribute(colors, 3));
  geo.computeVertexNormals();
  const mesh = new THREE.Mesh(geo, new THREE.MeshStandardMaterial({
    vertexColors: true, flatShading: true, roughness: 1,
  }));
  mesh.receiveShadow = true;
  return mesh;
}

// --- instanced vegetation helpers ---
function instanced(geo, material, transforms, { shadow = true, colorJitter = 0 } = {}) {
  const m = new THREE.InstancedMesh(geo, material, transforms.length);
  const dummy = new THREE.Object3D();
  const rng = mulberry32(7);
  const c = new THREE.Color();
  transforms.forEach((t, i) => {
    dummy.position.set(t.x, t.y, t.z);
    dummy.rotation.y = t.ry || 0;
    dummy.scale.setScalar(t.s || 1);
    if (t.sy) dummy.scale.y = t.sy;
    if (t.sx) dummy.scale.x = t.sx;
    if (t.sz) dummy.scale.z = t.sz;
    dummy.updateMatrix();
    m.setMatrixAt(i, dummy.matrix);
    if (colorJitter) {
      // instanceColor multiplies material.color, so jitter around white
      const j = 1 + (rng() - 0.5) * colorJitter;
      c.setScalar(j);
      m.setColorAt(i, c);
    }
  });
  if (m.instanceColor) m.instanceColor.needsUpdate = true;
  m.castShadow = shadow;
  m.receiveShadow = false;
  return m;
}

export function buildWorld(scene) {
  const colliders = [];
  const rng = mulberry32(1234);

  scene.fog = new THREE.Fog(0xb6d4ea, 60, 170);
  scene.background = new THREE.Color(0xb6d4ea);

  // lights
  scene.add(new THREE.HemisphereLight(0xbfd8ec, 0x8a955f, 0.85));
  const sun = new THREE.DirectionalLight(0xfff0d0, 1.6);
  sun.position.set(60, 90, -40);
  sun.castShadow = true;
  sun.shadow.mapSize.set(2048, 2048);
  sun.shadow.camera.left = -120; sun.shadow.camera.right = 120;
  sun.shadow.camera.top = 120; sun.shadow.camera.bottom = -120;
  sun.shadow.camera.far = 260;
  sun.shadow.bias = -0.001;
  scene.add(sun);

  scene.add(buildTerrain());

  // --- tree placement ---
  const pines = [];
  const oaks = [];
  const treeCollide = (x, z, r = 0.6) =>
    colliders.push({ minX: x - r, maxX: x + r, minZ: z - r, maxZ: z + r });

  // enclosing forest ring (two layers)
  const ringSpots = [];
  for (let x = -96; x <= 96; x += 7) { ringSpots.push([x, -90]); ringSpots.push([x, 90]); }
  for (let z = -88; z <= 88; z += 7) { ringSpots.push([-97, z]); ringSpots.push([97, z]); }
  for (const [bx, bz] of ringSpots) {
    const x = bx + (rng() - 0.5) * 5, z = bz + (rng() - 0.5) * 5;
    if (roadDistance(x, z) < 5) continue; // leave gaps where roads meet the edge
    pines.push({ x, y: groundHeight(x, z), z, s: 0.8 + rng() * 0.7, ry: rng() * 6.28 });
    treeCollide(x, z);
    // backdrop layer past the bounds, no collider needed
    const x2 = x * 1.12, z2 = z * 1.12;
    pines.push({ x: x2, y: groundHeight(x2, z2), z: z2, s: 0.9 + rng() * 0.8, ry: rng() * 6.28 });
  }

  // scattered oaks inside town limits
  const oakSpots = [
    [-66, -12], [-72, 16], [-60, 44], [-22, 62], [24, 58], [56, 38],
    [-12, -42], [26, -34], [-55, 8], [38, -18], [-26, 22], [22, 22],
    [-8, 50], [48, 24], [-58, -28], [10, -44],
  ];
  for (const [x, z] of oakSpots) {
    if (roadDistance(x, z) < 4) continue;
    oaks.push({ x, y: groundHeight(x, z), z, s: 0.8 + rng() * 0.6, ry: rng() * 6.28 });
    treeCollide(x, z);
  }

  // pines on the manor hill
  for (const [x, z] of [[64, -26], [86, -24], [88, 0], [68, 6], [84, -34]]) {
    pines.push({ x, y: groundHeight(x, z), z, s: 0.9 + rng() * 0.5, ry: rng() * 6.28 });
    treeCollide(x, z);
  }

  // orchard: apple trees in rows
  const apples = [];
  for (let row = 0; row < 3; row++) {
    for (let col = 0; col < 4; col++) {
      const x = -60 + col * 4.5, z = -52 + row * 4.5;
      apples.push({ x, y: groundHeight(x, z), z, s: 0.9 + rng() * 0.25, ry: rng() * 6.28 });
      treeCollide(x, z, 0.4);
    }
  }

  const trunkGeo = new THREE.CylinderGeometry(0.22, 0.34, 1.3, 5);
  trunkGeo.translate(0, 0.65, 0);
  const pineGeo = new THREE.ConeGeometry(1.7, 4.6, 6);
  pineGeo.translate(0, 3.3, 0);
  const oakGeo = new THREE.IcosahedronGeometry(1.9, 0);
  oakGeo.scale(1, 0.85, 1);
  oakGeo.translate(0, 3.0, 0);
  const appleGeo = new THREE.IcosahedronGeometry(1.4, 0);
  appleGeo.translate(0, 2.2, 0);

  scene.add(instanced(trunkGeo, mat(0x6e4a2e), [...pines, ...oaks, ...apples]));
  scene.add(instanced(pineGeo, mat(0x44663d), pines, { colorJitter: 0.25 }));
  scene.add(instanced(oakGeo, mat(0x567a44), oaks, { colorJitter: 0.3 }));
  scene.add(instanced(appleGeo, mat(0x5d8a48), apples, { colorJitter: 0.2 }));

  // little red apples dotted on the orchard trees
  const appleDots = [];
  for (const a of apples) {
    for (let i = 0; i < 3; i++) {
      const ang = rng() * 6.28, r = 1.0 + rng() * 0.4;
      appleDots.push({
        x: a.x + Math.cos(ang) * r, y: a.y + 1.8 + rng() * 0.9, z: a.z + Math.sin(ang) * r, s: 1,
      });
    }
  }
  scene.add(instanced(new THREE.SphereGeometry(0.13, 5, 4), mat(0xc23b2e), appleDots, { shadow: false }));

  // rocks near the hill and scattered
  const rocks = [];
  for (const [x, z, s] of [[58, -28, 1.6], [90, -32, 2.2], [92, 6, 1.8], [62, 10, 1.2], [-70, 30, 1.4], [-30, -60, 1.3], [30, 40, 1.0]]) {
    rocks.push({ x, y: groundHeight(x, z), z, s, sy: s * 0.55, ry: rng() * 6.28 });
    colliders.push({ minX: x - s, maxX: x + s, minZ: z - s, maxZ: z + s });
  }
  scene.add(instanced(new THREE.IcosahedronGeometry(1, 0), mat(0x8d8678), rocks));

  // --- fences (instanced posts and rails) ---
  const posts = [];
  const rails = [];
  function fence(ax, az, bx, bz) {
    const len = Math.hypot(bx - ax, bz - az);
    const ry = Math.atan2(bx - ax, bz - az);
    const n = Math.max(2, Math.round(len / 2.5));
    for (let i = 0; i <= n; i++) {
      const t = i / n, x = ax + (bx - ax) * t, z = az + (bz - az) * t;
      posts.push({ x, y: groundHeight(x, z), z });
    }
    const mx = (ax + bx) / 2, mz = (az + bz) / 2;
    for (const h of [0.45, 0.85]) {
      rails.push({ x: mx, y: groundHeight(mx, mz) + h, z: mz, ry, sz: len, s: 1 });
    }
    // thin collider along the rail
    const r = 0.25;
    colliders.push({
      minX: Math.min(ax, bx) - r, maxX: Math.max(ax, bx) + r,
      minZ: Math.min(az, bz) - r, maxZ: Math.max(az, bz) + r,
    });
  }
  // farm field (gap on the north side, toward the cottage)
  fence(-50, 42, -50, 54); fence(-50, 54, -34, 54); fence(-34, 54, -34, 42);
  fence(-34, 42, -44, 42);
  // orchard (gap on the east side)
  fence(-64, -56, -64, -36); fence(-64, -36, -46, -36); fence(-64, -56, -46, -56);

  const postGeo = new THREE.BoxGeometry(0.18, 1.1, 0.18);
  postGeo.translate(0, 0.55, 0);
  const railGeo = new THREE.BoxGeometry(0.08, 0.08, 1); // scaled per-rail via sz
  scene.add(instanced(postGeo, mat(0x7a5c3a), posts));
  scene.add(instanced(railGeo, mat(0x8a6a45), rails));

  // crop rows in the farm field
  const rows = [];
  const sprouts = [];
  for (let i = 0; i < 5; i++) {
    const z = 44 + i * 2.2;
    rows.push({ x: -42, y: groundHeight(-42, z) + 0.12, z, sz: 1, sx: 13, s: 1 });
    for (let j = 0; j < 9; j++) {
      const x = -48 + j * 1.5;
      sprouts.push({ x, y: groundHeight(x, z) + 0.2, z, s: 0.7 + ((i * 9 + j) % 4) * 0.15 });
    }
  }
  scene.add(instanced(new THREE.BoxGeometry(1, 0.24, 0.9), mat(0x6b4a2c), rows, { shadow: false }));
  scene.add(instanced(new THREE.ConeGeometry(0.22, 0.5, 5), mat(0x76a348), sprouts, { shadow: false }));

  // --- clouds ---
  const clouds = new THREE.Group();
  const cloudMat = new THREE.MeshStandardMaterial({
    color: 0xf6f9fc, flatShading: true, roughness: 1,
    emissive: 0xffffff, emissiveIntensity: 0.35,
  });
  const cloudList = [];
  for (let i = 0; i < 6; i++) {
    const g = new THREE.Group();
    const n = 3 + Math.floor(rng() * 2);
    for (let j = 0; j < n; j++) {
      const s = 3.5 + rng() * 4;
      const puff = new THREE.Mesh(new THREE.IcosahedronGeometry(s, 0), cloudMat);
      puff.position.set((j - n / 2) * s * 1.1, (rng() - 0.5) * 1.5, (rng() - 0.5) * 4);
      puff.scale.y = 0.5;
      g.add(puff);
    }
    g.position.set(-140 + rng() * 280, 46 + rng() * 18, -90 + rng() * 180);
    cloudList.push({ g, speed: 0.6 + rng() * 0.8 });
    clouds.add(g);
  }
  scene.add(clouds);

  function tick(dt) {
    for (const c of cloudList) {
      c.g.position.x += c.speed * dt;
      if (c.g.position.x > 150) c.g.position.x = -150;
    }
  }

  return { colliders, bounds: BOUNDS, groundHeight, tick };
}
