# Phandalin First-Person Explorer — Design

**Date:** 2026-06-10
**Status:** Approved

## Overview

A free-roam, first-person, low-poly 3D recreation of the town of Phandalin (D&D 5e, *Lost Mine of Phandelver*) that runs as a static web page. Intended use: the DM opens it on a laptop/TV at the table (or screen-shares online); one person drives with WASD + mouse-look while the party watches. The world is scoped strictly to the town — natural boundaries (hills, woods, fences, fog) keep the player inside Phandalin.

All visible content is **player-safe**: descriptions, public rumors, shop services. No spoilers (e.g., no Glasstaff identity reveal, no Redbrand hideout interior, no DM-only notes).

All location/NPC text is **original paraphrase** of module material — no verbatim WotC text and no copies of official artwork.

## Decisions (from brainstorming)

| Question | Decision |
|---|---|
| Format | Full first-person 3D game, town only |
| Play setup | One shared screen; single driver; no networking |
| Visual style | Low-poly stylized 3D, flat-shaded pastel palette, warm daylight |
| Buildings | Info overlays for most; walk-in interiors for 2 key spots (Stonehill Inn, The Sleeping Giant) |
| NPCs | Key NPCs with dialog; a few ambient wanderers |
| Audience | Player-safe content only (no DM toggle) |
| Tech | Procedural Three.js — no external 3D assets, no build step, static site |

## The Town

Layout follows the official module map: the Triboar Trail enters from the west and becomes the main street; the ruined Tresendar Manor sits on a hill to the east. Dirt roads, fences, orchard rows, scattered trees, and rocky rises bound the playable area.

### Locations (all 10 canonical)

| # | Location | Interaction | Key NPC(s) nearby |
|---|---|---|---|
| 1 | Stonehill Inn | **Walk-in interior** (taproom, hearth, bar) | Toblen Stonehill |
| 2 | Barthen's Provisions | Info overlay | Elmar Barthen |
| 3 | Lionshield Coster | Info overlay | Linene Graywind |
| 4 | Phandalin Miner's Exchange | Info overlay | Halia Thornton |
| 5 | Alderleaf Farm | Info overlay | Qelline Alderleaf, Carp |
| 6 | Shrine of Luck | Info overlay | Sister Garaele |
| 7 | The Sleeping Giant | **Walk-in interior** (rundown taproom) | Grista; Redbrand ruffians loitering outside |
| 8 | Townmaster's Hall | Info overlay | Harbin Wester |
| 9 | Tresendar Manor | Info overlay (ruins, exterior only) | — |
| 10 | Edermath Orchard | Info overlay | Daran Edermath |

Each location overlay shows: name, short evocative description, who's there, services/prices where relevant, and public rumors/quest hooks.

## Gameplay

- **Movement:** WASD + pointer-lock mouse look, walking pace, simple collision against buildings/fences/world bounds. Esc releases the mouse; click to re-capture.
- **Proximity labels:** nearing a building floats its name above the door; nearing an NPC shows their name.
- **Interact (E):**
  - Most buildings → parchment-styled overlay panel slides over the 3D view.
  - Stonehill Inn & Sleeping Giant doors → fade transition into a walk-in interior scene; exit door returns to town.
  - NPCs → dialog box in their voice: greeting, what they offer/know, rumor hooks. Player-safe only.
- **NPC behavior:** key NPCs idle near their buildings (small turn/shuffle animations); 3–5 ambient villagers wander preset paths.
- **Atmosphere:** warm directional sunlight + soft ambient, gentle distance fog at town edges, low-poly clouds. No audio in v1.

## Architecture

Static site. No bundler, no server logic. Three.js pinned via CDN import map.

```
phandalin-map/
├── index.html          # shell, import map, WebGL fallback message
├── style.css           # UI: overlays, dialog boxes, labels, HUD hints
├── src/
│   ├── main.js         # boot, scene setup, render loop, state (town vs interior)
│   ├── world.js        # terrain, roads, lighting, fog, bounds, trees/fences
│   ├── buildings.js    # procedural low-poly building factory + town assembly
│   ├── interiors.js    # Stonehill Inn + Sleeping Giant interior scenes
│   ├── npcs.js         # NPC meshes (primitive humanoids), idle/wander logic
│   ├── controls.js     # pointer-lock movement + collision
│   ├── interact.js     # proximity detection, E-key dispatch
│   └── ui.js           # overlay panels, dialog boxes, floating labels, hints
└── data/
    ├── locations.js    # all location text (descriptions, services, rumors)
    └── npcs.js         # all NPC dialog text
```

- **Data/code separation:** every piece of game text lives in `data/` so descriptions and rumors can be edited without touching 3D code.
- **State:** one top-level mode switch — `town` or an interior id. Interiors are separate small scenes; entering/leaving swaps the active scene with a fade.
- **Collision:** axis-aligned bounding boxes per building/fence + a world boundary; resolved by sliding (no physics engine).
- **Error handling:** WebGL unavailable → friendly fallback message. Pointer-lock denied → on-screen instruction to click the canvas.

## Run

Any static file server, e.g. `python3 -m http.server` from the project root, then open `http://localhost:8000`. (ES modules require a server; file:// won't work.)

## Testing

- **Unit tests** (node, no browser): data integrity (every location has description/rumors; every NPC has dialog and a valid location ref), collision/proximity math.
- **Manual verification:** walk every location, trigger every overlay, both interiors, and every NPC dialog before calling it done.

## Out of Scope (v1)

- Multiplayer / networking, player accounts
- DM-only content toggle
- Areas outside Phandalin (Triboar Trail, Cragmaw, Wave Echo Cave)
- Combat, inventory, quest tracking
- Audio
