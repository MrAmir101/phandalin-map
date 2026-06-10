# Phandalin First-Person Explorer Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** A static-site, first-person, low-poly 3D walkable Phandalin with 10 interactive locations, talking NPCs, and 2 walk-in interiors, shown on one shared screen at the table.

**Architecture:** Vanilla ES modules + Three.js (vendored, no CDN dependency at the table, no bundler). One top-level mode switch between the town scene and two interior scenes. All game text lives in `data/`; all pure logic (collision, data) is unit-tested with `node --test`; 3D visuals are verified by walking the town.

**Tech Stack:** Three.js (vendored ESM build), vanilla JS/CSS, Node built-in test runner. Served by any static server (`python3 -m http.server`).

**Spec:** `docs/superpowers/specs/2026-06-10-phandalin-first-person-explorer-design.md`

---

## World conventions

- Units = meters. +X east, +Z south, Y up. Origin = town square.
- Player: eye height 1.7, radius 0.5, walk 4.5 m/s (Shift = 8 m/s).
- Town bounds: x ∈ [-100, 100], z ∈ [-95, 95]; fog `0xcfe3f2` from 60→160.
- Palette: grass `0x8fae6a`, road `0xc9ad7e`, walls `0xa0764e`/`0xb08a5e`/`0x9c8d6b`, roofs `0xa8442e`/`0x7c6a4f`/`0x5e718a`, foliage `0x4f7942`, sky `0x9fc7e8`.

## Town layout (locked coordinates)

Road: Triboar Trail enters NW at (-85, -70), curves through town square (0, 0), continues south to (0, 65); east branch from square to (78, -2) climbing Tresendar hill.

| # | id | Location | Position (x, z) | Faces | Notes |
|---|----|----------|-----------------|-------|-------|
| 1 | `stonehill-inn` | Stonehill Inn | (-10, -12) | E (square) | **interior: `inn`**, 2-story, sign |
| 2 | `barthens-provisions` | Barthen's Provisions | (18, -12) | W (square) | wide trade post, crates outside |
| 3 | `lionshield-coster` | Lionshield Coster | (-24, 4) | E | blue shield sign |
| 4 | `miners-exchange` | Phandalin Miner's Exchange | (14, 32) | N | by south road, ore cart |
| 5 | `alderleaf-farm` | Alderleaf Farm | (-38, 36) | NE | small cottage + field rows + windmill-less barn |
| 6 | `shrine-of-luck` | Shrine of Luck | (4, -26) | S (square) | tiny stone shrine, no door — overlay at altar |
| 7 | `sleeping-giant` | The Sleeping Giant | (40, 12) | N (east road) | **interior: `giant`**, shabby, leaning |
| 8 | `townmasters-hall` | Townmaster's Hall | (12, 6) | W (square) | notice board prop beside door |
| 9 | `tresendar-manor` | Tresendar Manor | (78, -14) | W | ruin on hill (y≈4 mound), broken walls, no roof |
| 10 | `edermath-orchard` | Edermath Orchard | (-48, -42) | SE | cottage + 12 apple trees in rows |

NPC placements (near "their" building): Toblen (inside inn, behind bar), Elmar (18, -7), Linene (-21, 4), Halia (14, 28), Qelline (-35, 33) + Carp (-33, 35, child-size), Sister Garaele (4, -23), Grista (inside giant, behind bar), 2 Redbrand ruffians (37, 16) & (42, 17), Harbin (12, 9), Daran (-44, -39). Ambient wanderers: 4 villagers on road waypoint loops.

## File structure

```
phandalin-map/
├── package.json            # {"type":"module"} + test script
├── index.html              # shell, import map → vendor/three, UI divs, WebGL fallback
├── style.css               # crosshair, hint bar, floating label, panel, dialog, fade, start screen
├── vendor/three.module.js  # vendored Three.js (pinned 0.160.0)
├── src/
│   ├── main.js             # boot, mode switch (town/interior), render loop
│   ├── world.js            # terrain, roads, hills, trees, fences, fog, lights, bounds
│   ├── buildings.js        # makeBuilding() factory + assembleTown() → {group, colliders, hotspots}
│   ├── interiors.js        # buildInn(), buildGiant() → {scene, colliders, hotspots, spawn}
│   ├── npcs.js             # makePerson() factory, placement, idle/wander tick
│   ├── controls.js         # pointer lock, WASD/Shift, uses collision.resolveMovement
│   ├── collision.js        # PURE: AABB slide resolution (unit-tested)
│   ├── interact.js         # nearest-hotspot picking (pure helper + wiring), E dispatch
│   └── ui.js               # DOM: hint, label projection, panel, dialog, fade, start screen
├── data/
│   ├── locations.js        # 10 entries (schema below)
│   └── npcs.js             # all NPC dialog (schema below)
├── tests/
│   ├── data.test.js
│   ├── collision.test.js
│   └── interact.test.js
└── README.md
```

## Data schemas

```js
// data/locations.js
export const locations = [
  {
    id: 'stonehill-inn',
    name: 'Stonehill Inn',
    position: [-10, -12],          // door hotspot derives from building facing
    interior: 'inn',               // only stonehill-inn ('inn') and sleeping-giant ('giant')
    blurb: 'A modest, newly built inn at the heart of town.',
    description: ['…1-2 original paragraphs…'],
    whoIsHere: ['Toblen Stonehill, the innkeeper', '…'],
    services: ['Room for the night — 5 sp', '…'],   // [] if none
    rumors: ['…player-safe hooks…'],
  },
  // … all 10
];

// data/npcs.js
export const npcs = [
  {
    id: 'toblen', name: 'Toblen Stonehill', role: 'Innkeeper',
    location: 'stonehill-inn',     // must match a location id
    scene: 'inn',                  // 'town' | 'inn' | 'giant'
    position: [0, 0],              // town coords, or interior-local coords
    facing: Math.PI,               // radians yaw
    look: { body: 0x7a5230, head: 0xe0ac69, hair: 0x4b3621, hat: null, child: false },
    lines: ['…3-6 short player-safe dialog lines in their voice…'],
  },
  // … all key NPCs + redbrand-1/redbrand-2 + villager-1..4 (villagers: lines:[] and waypoints:[[x,z],…])
];
```

## Content facts (original phrasing required — no verbatim module text)

| Location | Player-safe facts to convey |
|---|---|
| Stonehill Inn | Run by Toblen Stonehill with wife Trilena and son Pip; came to prospect, found innkeeping suited him; six modest rooms; taproom is the town's gossip hub. Services: room 5 sp/night, meal 1 sp, ale 4 cp. Rumors: miners mutter about a banshee near Conyberry; nobody talks openly about the red-cloaked toughs. |
| Barthen's Provisions | Largest trade post; open dawn to dusk; lean, balding Elmar Barthen; clerks Ander & Thistle; stocks ordinary gear (no weapons/armor). Rumor: he's expecting a delayed delivery from Neverwinter. |
| Lionshield Coster | Branch of a Yartar merchant company (lion shield sign); sharp-eyed Linene Graywind sells weapons/armor at fair prices; recently lost a shipment to bandits and is in a foul mood about it. |
| Miner's Exchange | Where prospectors weigh and sell ore; doubles as unofficial records office; run by ambitious, sharp Halia Thornton, who always seems to want something in return for favors. |
| Alderleaf Farm | Halfling farm; warm, sensible Qelline Alderleaf; her boy Carp pokes his nose everywhere and brags he's found secret things near the old manor (rumor). |
| Shrine of Luck | Phandalin's only temple, a small stone shrine of Tymora, goddess of luck; tended by earnest young elf Sister Garaele; offers healing to the faithful; she's curious about a banshee called Agatha (hook). |
| Sleeping Giant | Grimy, rundown taproom at the east end; surly dwarf barkeep Grista; favored hangout of the red-cloaked ruffians — decent folk steer clear. |
| Townmaster's Hall | Seat of pompous Townmaster Harbin Wester, a banker who'd rather not hear about trouble; notice board outside offers a reward for dealing with orcs near Wyvern Tor (hook). |
| Tresendar Manor | Ruined manor on the eastern hill, empty for centuries since the Tresendar family fell; locals say it's haunted and that the red cloaks prowl near it after dark (rumor). |
| Edermath Orchard | Tidy apple orchard; silver-haired half-elf Daran Edermath, a retired marshal/adventurer; friendly, worried about the Redbrands, and asks about strange diggings at Old Owl Well (hook). |

Redbrand ruffians (outside Sleeping Giant): menacing but non-spoiler lines ("Move along, stranger…").

---

### Task 1: Scaffold + render pipeline proof

**Files:** Create `package.json`, `vendor/three.module.js`, `index.html`, `style.css`, `src/main.js`, `README.md`

- [ ] **Step 1:** `package.json`:

```json
{
  "name": "phandalin-map",
  "private": true,
  "type": "module",
  "scripts": { "test": "node --test tests/", "serve": "python3 -m http.server 8000" }
}
```

- [ ] **Step 2:** Vendor Three.js: `curl -fsSL https://cdn.jsdelivr.net/npm/three@0.160.0/build/three.module.js -o vendor/three.module.js` (verify file starts with license banner, ~1.2 MB).
- [ ] **Step 3:** `index.html` — import map `{"imports": {"three": "./vendor/three.module.js"}}`, `<canvas id="scene">`, UI divs (`#start-screen`, `#crosshair`, `#hint`, `#float-label`, `#panel`, `#dialog`, `#fade`), `<noscript>`/WebGL-fail fallback message div.
- [ ] **Step 4:** `style.css` — full-viewport canvas, hidden-by-default UI elements, start screen overlay.
- [ ] **Step 5:** `src/main.js` — renderer, sky-color clear, ambient+directional light, ground plane, one test box, animation loop.
- [ ] **Step 6:** Verify: `python3 -m http.server 8000` + check page serves and module imports resolve (HTTP 200 for `/vendor/three.module.js`, no console errors via manual check).
- [ ] **Step 7:** `git add -A && git commit -m "feat: scaffold static three.js app with vendored build"`

### Task 2: Content data + integrity tests (TDD)

**Files:** Create `tests/data.test.js`, `data/locations.js`, `data/npcs.js`

- [ ] **Step 1:** Write `tests/data.test.js` FIRST:

```js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { locations } from '../data/locations.js';
import { npcs } from '../data/npcs.js';

test('exactly 10 locations with unique ids', () => {
  assert.equal(locations.length, 10);
  assert.equal(new Set(locations.map(l => l.id)).size, 10);
});

test('every location has required content fields', () => {
  for (const l of locations) {
    assert.ok(l.name && l.blurb, l.id);
    assert.ok(Array.isArray(l.position) && l.position.length === 2, l.id);
    assert.ok(l.description.length >= 1 && l.description.every(p => p.length > 40), l.id);
    assert.ok(Array.isArray(l.whoIsHere) && Array.isArray(l.services) && Array.isArray(l.rumors), l.id);
  }
});

test('exactly two walk-in interiors: inn and giant', () => {
  assert.deepEqual(locations.filter(l => l.interior).map(l => l.interior).sort(), ['giant', 'inn']);
});

test('every npc references a valid location and scene', () => {
  const ids = new Set(locations.map(l => l.id));
  for (const n of npcs) {
    assert.ok(ids.has(n.location), `${n.id} -> ${n.location}`);
    assert.ok(['town', 'inn', 'giant'].includes(n.scene), n.id);
  }
});

test('named npcs have dialog; villagers have waypoints', () => {
  for (const n of npcs) {
    if (n.id.startsWith('villager')) assert.ok(n.waypoints.length >= 2, n.id);
    else assert.ok(n.lines.length >= 3 && n.lines.every(s => s.length > 10), n.id);
  }
});

test('no DM spoilers leak into player-safe text', () => {
  const all = JSON.stringify({ locations, npcs }).toLowerCase();
  for (const banned of ['glasstaff', 'iarno', 'black spider', 'nezznar', 'wave echo']) {
    assert.ok(!all.includes(banned), `spoiler: ${banned}`);
  }
});
```

- [ ] **Step 2:** Run `npm test` → FAIL (modules missing).
- [ ] **Step 3:** Write `data/locations.js` — all 10 entries per schema + layout table + content-facts table. Original prose only.
- [ ] **Step 4:** Write `data/npcs.js` — Toblen, Elmar, Linene, Halia, Qelline, Carp, Garaele, Grista, Harbin, Daran, redbrand-1, redbrand-2 (all with `lines`), villager-1..4 (with `waypoints` loops along roads).
- [ ] **Step 5:** `npm test` → all PASS.
- [ ] **Step 6:** `git commit -m "feat: add player-safe location and npc content with integrity tests"`

### Task 3: Collision module (TDD)

**Files:** Create `tests/collision.test.js`, `src/collision.js`

- [ ] **Step 1:** Write tests FIRST:

```js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { resolveMovement } from '../src/collision.js';

const box = { minX: -1, maxX: 1, minZ: -1, maxZ: 1 }; // building footprint

test('free movement passes through empty space', () => {
  assert.deepEqual(resolveMovement({ x: 5, z: 5 }, { x: 1, z: 0 }, 0.5, [box]), { x: 6, z: 5 });
});

test('blocked head-on by expanded AABB', () => {
  const p = resolveMovement({ x: -3, z: 0 }, { x: 2, z: 0 }, 0.5, [box]);
  assert.ok(p.x <= -1.5 + 1e-9); // wall at minX(-1) - radius(0.5)
});

test('slides along wall when moving diagonally into it', () => {
  const p = resolveMovement({ x: -2, z: 0 }, { x: 1, z: 0.5 }, 0.5, [box]);
  assert.equal(p.z, 0.5);        // z component survives
  assert.ok(p.x <= -1.5 + 1e-9); // x clamped at wall
});

test('clamps to world bounds', () => {
  const p = resolveMovement({ x: 99, z: 0 }, { x: 5, z: 0 }, 0.5, [], { minX: -100, maxX: 100, minZ: -95, maxZ: 95 });
  assert.ok(p.x <= 100 - 0.5 + 1e-9);
});
```

- [ ] **Step 2:** `npm test` → new tests FAIL.
- [ ] **Step 3:** Implement `src/collision.js`:

```js
// Axis-separated slide: try full move; on overlap, keep per-axis components that stay free.
function hits(x, z, r, boxes) {
  return boxes.some(b => x > b.minX - r && x < b.maxX + r && z > b.minZ - r && z < b.maxZ + r);
}
export function resolveMovement(pos, delta, radius, boxes, bounds) {
  let x = pos.x + delta.x, z = pos.z + delta.z;
  if (hits(x, z, radius, boxes)) {
    if (!hits(x, pos.z, radius, boxes)) z = pos.z;
    else if (!hits(pos.x, z, radius, boxes)) x = pos.x;
    else { x = pos.x; z = pos.z; }
  }
  if (bounds) {
    x = Math.min(bounds.maxX - radius, Math.max(bounds.minX + radius, x));
    z = Math.min(bounds.maxZ - radius, Math.max(bounds.minZ + radius, z));
  }
  return { x, z };
}
```

- [ ] **Step 4:** `npm test` → PASS. `git commit -m "feat: AABB slide collision with world bounds"`

### Task 4: Town world — terrain, roads, vegetation, bounds

**Files:** Create `src/world.js`; modify `src/main.js` (replace test box with world)

- [ ] **Step 1:** `buildWorld(scene)` → adds: large grass plane; road ribbons (flat boxes y=0.02 along the three road segments, with a plaza disc at the square); Tresendar hill (flattened cone, y≈4 mound under manor site, with a ramp path along east road); boundary hills/rock walls around perimeter; ~40 low-poly trees (cone+cylinder, 2 sizes) scattered outside building zones + 12 orchard apple trees in rows at Edermath; fences (post+rail boxes) around farm and orchard; `scene.fog = new THREE.Fog(0xcfe3f2, 60, 160)`; hemisphere + warm directional light (with simple shadows on, 2048 map); 5 flat-shaded cloud blobs (merged spheres) drifting slowly. Returns `{ colliders, bounds }` (tree trunks & fences included as small AABBs).
- [ ] **Step 2:** All meshes `flatShading: true`, `MeshLambertMaterial`-style look (use `MeshStandardMaterial` w/ `flatShading`, roughness 1).
- [ ] **Step 3:** Manual verify: orbit-ish debug camera at (0, 40, 60) looking at origin — town terrain reads correctly, roads connect, hill rises east.
- [ ] **Step 4:** `git commit -m "feat: town terrain, roads, hill, vegetation, lighting, fog"`

### Task 5: Buildings — factory + town assembly

**Files:** Create `src/buildings.js`; modify `src/main.js`

- [ ] **Step 1:** `makeBuilding(opts)` factory → `THREE.Group`:
  - walls: box (or two stacked boxes for 2-story); gable roof = `ConeGeometry(w*0.78, h, 4)` rotated π/4 and scaled to footprint (classic 4-segment-cone gable), overhanging eaves
  - door (dark inset box) on `faces` side + 2-3 windows (emissive warm `0xffd98a` panes); optional chimney (small box + smoke-grey cap); optional hanging sign (post + colored shield board)
  - ruin variant (`ruined: true`): 4 broken wall slabs of varied heights, rubble boxes, no roof
  - shrine variant (`shrine: true`): stone plinth + small peaked canopy on 4 posts
- [ ] **Step 2:** `assembleTown(scene)` — place all 10 per the locked layout table (sizes: inn 10×8 two-story; trade posts 9×7; cottages 6×5; giant 8×6 with slight roll tilt for shabbiness; manor ruin 14×10 on hill). Also props: notice board (hall), crates (Barthen's), ore cart (exchange), field rows (farm), barrels (giant). Returns `{ colliders, hotspots }` where each hotspot = `{ kind: 'location', id, x, z }` at the door (1.2 m out from the wall).
- [ ] **Step 3:** Manual verify from debug camera + screenshot sanity: all 10 visible, doors face roads, manor sits on hill.
- [ ] **Step 4:** `git commit -m "feat: procedural buildings and full town assembly"`

### Task 6: First-person controls

**Files:** Create `src/controls.js`; modify `src/main.js` (debug camera → player)

- [ ] **Step 1:** `createControls(camera, domElement)` — click canvas → `requestPointerLock`; mousemove → yaw on player object, pitch on camera (clamp ±85°); keydown/keyup tracks WASD/arrows/Shift; `update(dt, colliders, bounds)` computes desired delta from yaw, calls `resolveMovement`, sets camera position (y=1.7). Exposes `enabled` flag (off while start screen/panel/dialog open → also releases keys).
- [ ] **Step 2:** Start screen wiring in `main.js`: "PHANDALIN — click to explore · WASD move · mouse look · E interact · Esc release" → click hides it and locks pointer; pointer-lock loss with no panel open → show paused hint.
- [ ] **Step 3:** Manual verify: walk the whole town; collide with every building; can't leave bounds; climb manor hill ramp (raycast terrain height OR simple: lerp player y to hill height function `groundHeight(x, z)` exported from world.js).
- [ ] **Step 4:** `git commit -m "feat: pointer-lock first-person movement with collision"`

### Task 7: Interaction picking (TDD for picker) + UI shell

**Files:** Create `tests/interact.test.js`, `src/interact.js`, `src/ui.js`

- [ ] **Step 1:** Test FIRST for pure picker:

```js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { pickHotspot } from '../src/interact.js';

const spots = [
  { id: 'a', x: 0, z: -3 },   // 3m ahead (facing -Z)
  { id: 'b', x: 0, z: -10 },  // too far
  { id: 'c', x: 0, z: 3 },    // behind
];

test('picks nearest hotspot within range and facing cone', () => {
  assert.equal(pickHotspot({ x: 0, z: 0 }, -Math.PI, spots, 4).id, 'a'); // yaw facing -Z... use forward vector form
});
test('returns null when nothing in range', () => {
  assert.equal(pickHotspot({ x: 50, z: 50 }, 0, spots, 4), null);
});
```

(Use forward vector `fx = -sin(yaw), fz = -cos(yaw)`; require `dist <= range` and `dot(forward, dirToSpot) > 0.35`.)

- [ ] **Step 2:** Implement `pickHotspot`, run tests → PASS.
- [ ] **Step 3:** `src/ui.js` — parchment panel (`showLocation(loc)`: name header, description ¶s, "Who's here", "Services", "Rumors" with bullet styling; close on E/Esc/×), dialog box (`showDialog(npc)`: portrait swatch + name + line; E advances, closes after last), floating label (`updateLabel(hotspot)` projects door/NPC head position to 2D, hides off-screen), hint bar, `fade(cb)` 400ms black dip. Parchment styling: warm paper bg, dark-brown serif text, red wax accent.
- [ ] **Step 4:** Wire in `main.js`/`interact.js`: per-frame pick among location hotspots → label + hint "[E] …"; E opens panel; controls disabled while open.
- [ ] **Step 5:** Manual verify: all 10 location panels open with correct content. `npm test` green.
- [ ] **Step 6:** `git commit -m "feat: interaction picking, location panels, dialog UI"`

### Task 8: NPCs — bodies, idling, wanderers, dialog

**Files:** Create `src/npcs.js`; modify `src/main.js`

- [ ] **Step 1:** `makePerson(look)` — capsule-ish body (cylinder), sphere head, hair cap or hood cone, ~1.7 m (×0.62 for `child: true`); arms optional (two thin cylinders). Flat-shaded.
- [ ] **Step 2:** `spawnNpcs(scene, sceneId)` places NPCs with `scene === sceneId`; returns `{ group, hotspots, tick }`. `tick(dt, playerPos)`: idle NPCs slowly face the player when within 5 m (lerp yaw), subtle breathing bob; villagers walk waypoint loops at 1.2 m/s with turn-toward-waypoint.
- [ ] **Step 3:** NPC hotspots (`kind: 'npc'`) join the picker; E → `showDialog`; E advances lines.
- [ ] **Step 4:** Manual verify: every named town NPC reachable & talks; villagers loop without entering buildings (waypoints chosen on roads). `git commit -m "feat: npcs with dialog and ambient wanderers"`

### Task 9: Interiors — Stonehill Inn & Sleeping Giant

**Files:** Create `src/interiors.js`; modify `src/main.js` (scene-mode switch)

- [ ] **Step 1:** `buildInn()` / `buildGiant()` → `{ scene, colliders, hotspots, spawn }`. Both: room shell (floor, 4 walls, beams), warm point lights + dim ambient, exit-door hotspot (`kind: 'exit'`). Inn: bar counter, shelves with bottles, 4 round tables + stools, hearth with emissive flame cone + flicker (sin-noise intensity), Toblen behind bar, stairs prop. Giant: crooked tables, broken stool on floor, barrels, weak cold light, Grista behind bar, two seated Redbrand toughs (reuse makePerson with red hoods).
- [ ] **Step 2:** Mode switch in `main.js`: `enterInterior(id)` / `exitToTown()` — fade out, swap active scene/colliders/hotspots/npc-tick, reposition player (`spawn` inside; back at door in town), fade in. Door hotspots on the two buildings get `kind: 'enter'` instead of `'location'` — but their location info must stay reachable: inside each interior add a `kind: 'location'` hotspot at the bar ("Ask about the inn").
- [ ] **Step 3:** Manual verify: enter/exit both, talk to Toblen/Grista/toughs, no falling through floors, town state intact after return.
- [ ] **Step 4:** `git commit -m "feat: walk-in interiors for Stonehill Inn and Sleeping Giant"`

### Task 10: Polish + full walkthrough + README

**Files:** Modify `style.css`, `src/world.js`, `index.html`; create/finish `README.md`

- [ ] **Step 1:** Title screen art pass (serif title, parchment vignette), compass hint ("N" cue from sun direction), WebGL-fail message tested by forcing `WebGLRenderingContext` check off.
- [ ] **Step 2:** Performance: merged geometries for trees/fences (`BufferGeometryUtils.mergeGeometries` equivalent by hand or shared geometry+instancing), confirm smooth on integrated GPU (~60 fps target, check `renderer.info.render.calls < 300`).
- [ ] **Step 3:** README: what it is, `npm test`, `npm run serve`, controls, how to edit content in `data/`, spoiler policy.
- [ ] **Step 4:** FULL manual walkthrough checklist — every location panel (10), every named NPC (11 + 2 ruffians), both interiors in/out, bounds on all 4 sides, hill climb. Fix anything broken.
- [ ] **Step 5:** `npm test` green. `git commit -m "feat: polish pass, performance, README"`

---

## Self-review notes

- Spec coverage: all 10 locations (T2/T5), 2 interiors (T9), NPCs+dialog (T8), player-safe guard (T2 spoiler test), bounds/fog (T4), overlay UI (T7), static serving + fallback (T1/T10), data/code separation (T2), unit tests for data + collision + proximity (T2/T3/T7), manual walkthrough (T10). Audio/DM-toggle/multiplayer correctly absent (out of scope).
- Type consistency: `resolveMovement(pos, delta, radius, boxes, bounds)` used in T3/T6; hotspot shape `{kind, id, x, z}` used in T5/T7/T8/T9; `groundHeight(x,z)` exported by world (T6) — defined in T4's hill work.
