import * as THREE from 'three';
import { Sky } from 'three/addons/objects/Sky.js';
import { meshData, cloneModel } from './assets.js';

// Terrain, roads, vegetation, lighting, fog, and the manor hill.
// Exposes groundHeight(x, z) so the player, buildings, and NPCs all
// stand on the same surface. Vegetation comes from the KayKit hexagon
// pack, instanced so the whole forest is a handful of draw calls.

export const BOUNDS = { minX: -100, maxX: 100, minZ: -95, maxZ: 95 };

const HILL = { x: 78, z: -8, radius: 32, height: 4.2 };

const NATURE = 'assets/hexagon/decoration/nature/';
const NEUTRAL = 'assets/hexagon/buildings/neutral/';

export const WORLD_MODELS = [
  NATURE + 'tree_single_A.gltf',
  NATURE + 'tree_single_B.gltf',
  NATURE + 'rock_single_B.gltf',
  NATURE + 'rock_single_D.gltf',
  NATURE + 'cloud_big.gltf',
  NATURE + 'cloud_small.gltf',
  NEUTRAL + 'fence_wood_straight.gltf',
];

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
  { w: 2.0, pts: [[-48, -44], [-54, -44]] },         // spur: orchard cottage
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
  const grassA = new THREE.Color(0x83a85c);
  const grassB = new THREE.Color(0x6e9a4e);
  const grassDry = new THREE.Color(0xa3ad62);
  const dirtA = new THREE.Color(0xc4a878);
  const dirtB = new THREE.Color(0xb2965f);
  const c = new THREE.Color();
  const dirt = new THREE.Color();
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i), z = pos.getZ(i);
    pos.setY(i, groundHeight(x, z));
    // small-scale hash + a slow meadow swell for large patches of drier grass
    const n = Math.abs(Math.sin(x * 12.9898 + z * 78.233) * 43758.5453) % 1;
    const swell = 0.5 + 0.5 * Math.sin(x * 0.045 + 1.3) * Math.sin(z * 0.038 - 0.7);
    c.lerpColors(grassA, grassB, n).lerp(grassDry, swell * 0.45);
    // soft, noisy road edges instead of a hard cut
    const rd = roadDistance(x, z);
    const tRoad = Math.max(0, Math.min(1, (2.6 + (n - 0.5) * 1.6 - rd) / 1.2));
    if (tRoad > 0) {
      dirt.lerpColors(dirtA, dirtB, n);
      c.lerp(dirt, tRoad);
    }
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

// --- instanced model helper ---
function instancedModel(path, transforms, { shadow = true, colorJitter = 0 } = {}) {
  const { geometry, material } = meshData(path);
  const m = new THREE.InstancedMesh(geometry, material, transforms.length);
  const dummy = new THREE.Object3D();
  const rng = mulberry32(7);
  const c = new THREE.Color();
  transforms.forEach((t, i) => {
    dummy.position.set(t.x, t.y, t.z);
    dummy.rotation.y = t.ry || 0;
    dummy.scale.setScalar(t.s || 1);
    if (t.sx) dummy.scale.x = t.sx;
    if (t.sy) dummy.scale.y = t.sy;
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

  // --- golden hour: physical sky dome with a low north-eastern sun ---
  // Morning light: it falls on the east-facing entrances of the Stonehill
  // Inn and the Lionshield Coster (the two facades players study up close)
  // and stays out of frame both on the Triboar Trail arrival view and at
  // the inn doorstep, so the bloom pass never blows out those shots.
  const sky = new Sky();
  sky.name = 'sky'; // the aerial debug view hides it along with the fog
  sky.scale.setScalar(440); // box corners stay inside the camera's 500 m far plane
  const sunDir = new THREE.Vector3().setFromSphericalCoords(
    1,
    THREE.MathUtils.degToRad(90 - 14),  // elevation 14° — long shadows
    THREE.MathUtils.degToRad(135)       // azimuth: low in the north-east
  );
  const skyU = sky.material.uniforms;
  skyU.turbidity.value = 3.5;
  skyU.rayleigh.value = 2;
  skyU.mieCoefficient.value = 0.004;
  skyU.mieDirectionalG.value = 0.95; // tight golden sun glow, not a whiteout
  skyU.sunPosition.value.copy(sunDir);
  scene.add(sky);

  // haze matched to the sky's horizon tint (aerial debug clears the fog)
  scene.fog = new THREE.Fog(0xe3b88f, 70, 185);
  scene.background = new THREE.Color(0xe3b88f);

  // lights: cool blue from the sky half, warm bounce off the sunlit ground
  // (a little extra fill so shaded facades stay readable, not gloomy)
  scene.add(new THREE.HemisphereLight(0xa8bedd, 0x8f7244, 1.15));
  const sun = new THREE.DirectionalLight(0xffc070, 3.2);
  sun.position.copy(sunDir).multiplyScalar(140);
  sun.castShadow = true;
  sun.shadow.mapSize.set(2048, 2048);
  sun.shadow.camera.left = -120; sun.shadow.camera.right = 120;
  sun.shadow.camera.top = 120; sun.shadow.camera.bottom = -120;
  sun.shadow.camera.far = 260;
  sun.shadow.bias = -0.001;
  scene.add(sun);

  scene.add(buildTerrain());

  // --- tree placement ---
  // KayKit trees root themselves: trunks extend ~0.1 raw units below y=0,
  // so placing at ground height self-blends on slopes.
  const pines = [];   // tree_single_A — sharp pine, town/roadside/forest
  const rounded = []; // tree_single_B — soft two-tier tree, near houses
  const treeCollide = (x, z, r = 0.6) =>
    colliders.push({ minX: x - r, maxX: x + r, minZ: z - r, maxZ: z + r });

  // enclosing forest ring (two layers)
  const ringSpots = [];
  for (let x = -96; x <= 96; x += 7) { ringSpots.push([x, -90]); ringSpots.push([x, 90]); }
  for (let z = -88; z <= 88; z += 7) { ringSpots.push([-97, z]); ringSpots.push([97, z]); }
  for (const [bx, bz] of ringSpots) {
    const x = bx + (rng() - 0.5) * 5, z = bz + (rng() - 0.5) * 5;
    if (roadDistance(x, z) < 5) continue; // leave gaps where roads meet the edge
    pines.push({ x, y: groundHeight(x, z), z, s: 4.2 + rng() * 3.0, ry: rng() * 6.28 });
    treeCollide(x, z);
    // backdrop layer past the bounds, no collider needed
    const x2 = x * 1.12, z2 = z * 1.12;
    pines.push({ x: x2, y: groundHeight(x2, z2), z: z2, s: 4.6 + rng() * 3.4, ry: rng() * 6.28 });
  }

  // scattered shade trees inside town limits
  const treeSpots = [
    [-66, -12], [-72, 16], [-60, 44], [-22, 62], [24, 58], [56, 38],
    [-12, -42], [26, -34], [-55, 8], [38, -18], [-26, 22], [22, 22],
    [-8, 50], [48, 24], [-58, -28], [10, -44],
  ];
  for (const [x, z] of treeSpots) {
    if (roadDistance(x, z) < 4) continue;
    const list = rng() < 0.45 ? pines : rounded;
    list.push({ x, y: groundHeight(x, z), z, s: 4.0 + rng() * 1.8, ry: rng() * 6.28 });
    treeCollide(x, z);
  }

  // pines on the manor hill
  for (const [x, z] of [[64, -26], [86, -24], [88, 0], [68, 6], [84, -34]]) {
    pines.push({ x, y: groundHeight(x, z), z, s: 4.4 + rng() * 2.2, ry: rng() * 6.28 });
    treeCollide(x, z);
  }

  // orchard: rounded fruit trees in rows, across the trail from Daran's cottage
  const orchard = [];
  for (let row = 0; row < 3; row++) {
    for (let col = 0; col < 4; col++) {
      const x = -78 + col * 4.5, z = -52 + row * 4.5;
      orchard.push({ x, y: groundHeight(x, z), z, s: 3.7 + rng() * 0.8, ry: rng() * 6.28 });
      treeCollide(x, z, 0.4);
    }
  }

  scene.add(instancedModel(NATURE + 'tree_single_A.gltf', pines, { colorJitter: 0.22 }));
  scene.add(instancedModel(NATURE + 'tree_single_B.gltf', [...rounded, ...orchard], { colorJitter: 0.25 }));

  // little red apples dotted on the orchard trees
  const appleDots = [];
  for (const a of orchard) {
    for (let i = 0; i < 4; i++) {
      const ang = rng() * 6.28, r = 0.8 + rng() * 0.55;
      appleDots.push({
        x: a.x + Math.cos(ang) * r,
        y: a.y + a.s * (0.52 + rng() * 0.28),
        z: a.z + Math.sin(ang) * r,
        s: 1,
      });
    }
  }
  const appleGeo = new THREE.SphereGeometry(0.13, 5, 4);
  const appleMesh = new THREE.InstancedMesh(appleGeo, mat(0xc23b2e), appleDots.length);
  {
    const dummy = new THREE.Object3D();
    appleDots.forEach((a, i) => {
      dummy.position.set(a.x, a.y, a.z);
      dummy.updateMatrix();
      appleMesh.setMatrixAt(i, dummy.matrix);
    });
  }
  scene.add(appleMesh);

  // rocks near the hill and scattered
  const rocksB = [];
  const rocksD = [];
  for (const [x, z, s] of [[58, -28, 1.6], [90, -32, 2.2], [92, 6, 1.8], [62, 10, 1.2], [-70, 30, 1.4], [-30, -60, 1.3], [30, 40, 1.0]]) {
    const list = rng() < 0.5 ? rocksB : rocksD;
    list.push({ x, y: groundHeight(x, z), z, s: s * 5.5, ry: rng() * 6.28 });
    colliders.push({ minX: x - s, maxX: x + s, minZ: z - s, maxZ: z + s });
  }
  scene.add(instancedModel(NATURE + 'rock_single_B.gltf', rocksB));
  scene.add(instancedModel(NATURE + 'rock_single_D.gltf', rocksD));

  // --- fences: instanced KayKit picket segments (model runs along Z) ---
  const FENCE_RAW_LEN = 1.155;
  const FENCE_SCALE = 2.2;
  const fenceSegs = [];
  function fence(ax, az, bx, bz) {
    const len = Math.hypot(bx - ax, bz - az);
    const ry = Math.atan2(bx - ax, bz - az);
    const n = Math.max(1, Math.round(len / (FENCE_RAW_LEN * FENCE_SCALE)));
    for (let i = 0; i < n; i++) {
      const t = (i + 0.5) / n;
      const x = ax + (bx - ax) * t, z = az + (bz - az) * t;
      fenceSegs.push({
        x, y: groundHeight(x, z), z, ry,
        s: FENCE_SCALE, sz: (len / n) / FENCE_RAW_LEN,
      });
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
  // orchard (gap on the east side, toward the trail)
  fence(-81, -56, -81, -40); fence(-81, -40, -62, -40); fence(-81, -56, -62, -56);
  scene.add(instancedModel(NEUTRAL + 'fence_wood_straight.gltf', fenceSegs));

  // --- clouds (KayKit models, lit warm so they catch the low sun) ---
  const clouds = new THREE.Group();
  const cloudMat = new THREE.MeshStandardMaterial({
    color: 0xf3ece2, flatShading: true, roughness: 1,
    emissive: 0xffe3c2, emissiveIntensity: 0.45,
  });
  const cloudList = [];
  for (let i = 0; i < 7; i++) {
    const big = rng() < 0.6;
    const g = cloneModel(NATURE + (big ? 'cloud_big.gltf' : 'cloud_small.gltf'));
    g.traverse((o) => { if (o.isMesh) { o.material = cloudMat; o.castShadow = false; } });
    g.scale.setScalar(big ? 4.5 + rng() * 2.5 : 3 + rng() * 2);
    g.rotation.y = rng() * 6.28;
    g.position.set(-140 + rng() * 280, 52 + rng() * 16, -90 + rng() * 180);
    cloudList.push({ g, speed: 0.6 + rng() * 0.8 });
    clouds.add(g);
  }
  scene.add(clouds);

  // --- hearth smoke from the lived-in chimneys ---
  // The inn's chimney is baked into its model; the farm cottage has one too.
  // The townmaster's hall (a KayKit barracks) doesn't, so it gets a small
  // procedural stone stack for its smoke to rise from.
  const hallChimney = new THREE.Group();
  {
    const stack = new THREE.Mesh(new THREE.BoxGeometry(0.85, 3.2, 0.85), mat(0x6f6c66));
    stack.position.y = -1.5;
    stack.castShadow = true;
    const cap = new THREE.Mesh(new THREE.BoxGeometry(1.15, 0.3, 1.15), mat(0x5c5953));
    cap.position.y = -0.05;
    cap.castShadow = true;
    hallChimney.add(stack, cap);
    hallChimney.position.set(13.6, 7.6, 4.4);
    scene.add(hallChimney);
  }
  const smoke = makeSmoke(scene, [
    { x: -12.1, y: groundHeight(-10, -12) + 11.4, z: -12.6 },          // Stonehill Inn
    { x: 13.6, y: 7.75, z: 4.4 },                                       // Townmaster's Hall
    { x: -39.8, y: groundHeight(-38, 36) + 6.4, z: 37.8 },              // Alderleaf Farm
  ]);

  // --- dust motes drifting through the golden light near the shade trees ---
  const motes = makeMotes(scene, [
    [-26, 22], [22, 22], [-12, -42], [38, -18], [-8, 50], [10, -44], [-55, 8],
  ], rng);

  function tick(dt, _playerPos, t = 0) {
    for (const c of cloudList) {
      c.g.position.x += c.speed * dt;
      if (c.g.position.x > 150) c.g.position.x = -150;
    }
    smoke.tick(t);
    motes.tick(t);
  }

  return { colliders, bounds: BOUNDS, groundHeight, tick };
}

// --- atmosphere helpers ---

// soft round puff, drawn once onto a small canvas
function puffTexture(inner = 0.9, mid = 0.38) {
  const c = document.createElement('canvas');
  c.width = c.height = 64;
  const ctx = c.getContext('2d');
  const g = ctx.createRadialGradient(32, 32, 2, 32, 32, 30);
  g.addColorStop(0, `rgba(255,255,255,${inner})`);
  g.addColorStop(0.45, `rgba(255,255,255,${mid})`);
  g.addColorStop(1, 'rgba(255,255,255,0)');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, 64, 64);
  return new THREE.CanvasTexture(c);
}

const SMOKE_LIFE = 7; // seconds for one puff to rise and fade
function makeSmoke(scene, spots) {
  const tex = puffTexture(1.0, 0.55);
  const rng = mulberry32(99);
  const puffs = [];
  for (const s of spots) {
    for (let i = 0; i < 12; i++) {
      const m = new THREE.SpriteMaterial({
        map: tex, color: 0x9a9187, transparent: true, opacity: 0,
        depthWrite: false, rotation: rng() * 6.28,
      });
      const sp = new THREE.Sprite(m);
      sp.position.set(s.x, s.y, s.z);
      scene.add(sp);
      puffs.push({ sp, s, phase: i / 12, spin: (rng() - 0.5) * 0.35, wob: rng() * 6.28 });
    }
  }
  return {
    tick(t) {
      for (const p of puffs) {
        const u = (t / SMOKE_LIFE + p.phase) % 1;
        const drift = u * u * 4.0; // wind pushes harder as the puff climbs
        p.sp.position.set(
          p.s.x + drift + Math.sin(p.wob + t * 0.7 + u * 5) * 0.28 * u,
          p.s.y + u * 6.4,
          p.s.z + Math.cos(p.wob + u * 4) * 0.35 * u
        );
        const scale = 0.8 + u * 3.0;
        p.sp.scale.setScalar(scale);
        p.sp.material.rotation = p.wob + p.spin * t;
        const fadeIn = Math.min(1, u / 0.12);
        p.sp.material.opacity = 0.85 * fadeIn * Math.pow(1 - u, 0.65);
      }
    },
  };
}

// fireflies / sunlit dust hanging around the town's shade trees
function makeMotes(scene, spots, rng) {
  const tex = puffTexture(1, 0.5);
  const count = spots.length * 9;
  const base = new Float32Array(count * 3);
  const seed = new Float32Array(count);
  const pos = new Float32Array(count * 3);
  let k = 0;
  for (const [tx, tz] of spots) {
    for (let i = 0; i < 9; i++, k++) {
      const a = rng() * 6.28, r = 1 + rng() * 3.2;
      base[k * 3] = tx + Math.cos(a) * r;
      base[k * 3 + 1] = groundHeight(tx, tz) + 0.6 + rng() * 2.4;
      base[k * 3 + 2] = tz + Math.sin(a) * r;
      seed[k] = rng() * 6.28;
    }
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  const moteMat = new THREE.PointsMaterial({
    map: tex, color: 0xffce7a, size: 0.16, transparent: true, opacity: 0.85,
    blending: THREE.AdditiveBlending, depthWrite: false, sizeAttenuation: true,
  });
  const points = new THREE.Points(geo, moteMat);
  points.frustumCulled = false; // positions update in place; skip stale-bounds culling
  scene.add(points);
  return {
    tick(t) {
      for (let i = 0; i < count; i++) {
        const s = seed[i];
        pos[i * 3] = base[i * 3] + Math.sin(t * 0.5 + s) * 0.6;
        pos[i * 3 + 1] = base[i * 3 + 1] + Math.sin(t * 0.8 + s * 2) * 0.35;
        pos[i * 3 + 2] = base[i * 3 + 2] + Math.cos(t * 0.4 + s) * 0.6;
      }
      geo.attributes.position.needsUpdate = true;
    },
  };
}
