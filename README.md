# Phandalin — First-Person Explorer

A free-roam, first-person, low-poly 3D recreation of the town of **Phandalin**
(D&D 5e, *Lost Mine of Phandelver*), built to show your party the town on a
shared screen at the table. Walk the Triboar Trail into town, visit all ten
locations, talk to the townsfolk, and step inside the Stonehill Inn and the
Sleeping Giant.

Everything on screen is **player-safe**: descriptions, public rumors, services,
and quest hooks — no spoilers. All text is original paraphrase; no module text
or artwork is reproduced.

## Run it

ES modules need a web server (opening `index.html` directly won't work):

```sh
npm run serve        # python3 -m http.server 8000
# then open http://localhost:8000
```

No build step, no dependencies to install — Three.js is vendored in `vendor/`.
Works offline, so flaky game-store wifi is not a problem.

## Controls

| Input | Action |
|---|---|
| **W A S D** / arrows | Walk |
| **Mouse** | Look |
| **Shift** | Hurry |
| **E** | Interact: read a location, talk, enter/leave buildings |
| **Esc** | Release the mouse / pause |

Walk up to a building or NPC and press **E** when the prompt appears.
The Stonehill Inn and the Sleeping Giant can be entered through their doors.

## Editing the content

All game text lives in `data/` — no 3D knowledge needed:

- `data/locations.js` — descriptions, who's there, services, rumors per location
- `data/npcs.js` — every NPC's dialog lines, placement, and colors

Keep it player-safe: the test suite fails if known spoiler names appear.

## Credits

3D models are from [KayKit](https://kaylousberg.com/game-assets) by Kay Lousberg
(Medieval Hexagon Pack, Character Pack: Adventurers, Dungeon Remastered,
Furniture Bits) — all CC0, license files included under `assets/`. Thanks Kay!
Rendering by [three.js](https://threejs.org) (vendored).

## Tests

```sh
npm test
```

Covers data integrity (all 10 locations, valid NPC references, no spoiler
leaks), collision resolution, and interaction picking.

## Development extras

Debug URL parameters (used for screenshot verification):

- `?cam=aerial` — fog-free overhead view of the whole town
- `?at=x,z,yaw[,pitch]` — static first-person camera at town coordinates
- `?interior=inn|giant` — jump straight into an interior
- `?panel=<location-id>` / `?dialog=<npc-id>` — open a UI screen directly
