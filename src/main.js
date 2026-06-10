import * as THREE from 'three';
import { preloadModels } from './assets.js';
import { buildWorld, WORLD_MODELS } from './world.js';
import { assembleTown, TOWN_MODELS } from './buildings.js';
import { buildInn, buildGiant, INTERIOR_MODELS } from './interiors.js';
import { createControls } from './controls.js';
import { createUI } from './ui.js';
import { pickHotspot, actionVerb } from './interact.js';
import { spawnNpcs, NPC_MODELS } from './npcs.js';
import { locations } from '../data/locations.js';

const canvas = document.getElementById('scene');

function webglAvailable() {
  try {
    const c = document.createElement('canvas');
    return !!(window.WebGLRenderingContext &&
      (c.getContext('webgl2') || c.getContext('webgl')));
  } catch {
    return false;
  }
}

if (!webglAvailable()) {
  document.getElementById('webgl-fail').classList.remove('hidden');
  document.getElementById('start-screen').classList.add('hidden');
} else {
  boot().catch((err) => {
    console.error('phandalin: failed to start', err);
    const prompt = document.getElementById('start-prompt');
    if (prompt) prompt.textContent = 'Failed to load assets — see console';
  });
}

async function boot() {
  // preload every town/world model behind the start screen so the first
  // render (including ?cam/?at debug shots) sees the finished town
  const bootPrompt = document.getElementById('start-prompt');
  bootPrompt.textContent = 'Loading…';
  await preloadModels([...WORLD_MODELS, ...TOWN_MODELS, ...NPC_MODELS, ...INTERIOR_MODELS]);
  bootPrompt.textContent = 'Click to enter the town';

  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(70, window.innerWidth / window.innerHeight, 0.1, 500);

  const world = buildWorld(scene);
  const town = assembleTown(scene, world.groundHeight);
  const townNpcs = spawnNpcs(scene, 'town', world.groundHeight);
  const locationById = new Map(locations.map((l) => [l.id, l]));

  // a "stage" is whatever the player currently walks around in:
  // the town, or one of the interiors
  const townStage = {
    scene,
    colliders: [...world.colliders, ...town.colliders],
    bounds: world.bounds,
    groundHeight: world.groundHeight,
    hotspots: [...town.hotspots, ...townNpcs.hotspots],
    tick: (dt, playerPos, t) => {
      world.tick(dt);
      townNpcs.tick(dt, playerPos, t);
    },
  };
  let stage = townStage;

  const interiorCache = new Map();
  function getInterior(loc) {
    if (!interiorCache.has(loc.interior)) {
      const built = loc.interior === 'inn' ? buildInn(loc.id) : buildGiant(loc.id);
      built.locationId = loc.id;
      interiorCache.set(loc.interior, built);
    }
    return interiorCache.get(loc.interior);
  }

  const controls = createControls(camera, scene, canvas);
  // arrive on the Triboar Trail, looking down the road into town
  controls.placeAt(-68, -59, -2.2, world.groundHeight);

  const ui = createUI();
  ui.onModalChange = () => {
    if (started) controls.enabled = !ui.modalOpen && controls.isLocked();
  };

  const startScreen = document.getElementById('start-screen');
  const startPrompt = document.getElementById('start-prompt');
  const crosshair = document.getElementById('crosshair');
  let started = false;
  let currentHotspot = null;

  function setStage(next, x, z, yaw) {
    stage = next;
    stage.scene.add(controls.player); // reparents from the previous scene
    controls.placeAt(x, z, yaw, stage.groundHeight);
  }

  function enterInterior(loc, instant = false) {
    const interior = getInterior(loc);
    const { spawn } = interior;
    const go = () => setStage(interior, spawn.x, spawn.z, spawn.yaw);
    instant ? go() : ui.fade(go);
  }

  function exitInterior() {
    const door = townStage.hotspots.find(
      (h) => h.kind === 'enter' && h.id === stage.locationId
    );
    const dx = Math.sin(door.enterYaw), dz = Math.cos(door.enterYaw);
    ui.fade(() => setStage(townStage, door.x + dx * 0.4, door.z + dz * 0.4, door.exitYaw));
  }

  function activateHotspot(h) {
    if (!h) return;
    if (h.kind === 'npc') {
      ui.showDialog(h.npc);
    } else if (h.kind === 'enter') {
      const loc = locationById.get(h.id);
      if (loc && loc.interior) enterInterior(loc);
    } else if (h.kind === 'exit') {
      exitInterior();
    } else if (h.kind === 'location') {
      const loc = locationById.get(h.id);
      if (loc) ui.showLocation(loc);
    }
  }

  document.addEventListener('keydown', (e) => {
    if (e.code === 'Escape' && ui.modalOpen) {
      ui.closeModals();
      return;
    }
    if (e.code !== 'KeyE') return;
    if (ui.modalOpen) {
      if (!ui.advanceDialog()) ui.closeModals();
      return;
    }
    activateHotspot(currentHotspot);
  });

  // --- debug cameras and screens for development screenshots ---
  const params = new URLSearchParams(location.search);
  const debugView = params.has('cam') || params.has('at');
  if (debugView) {
    startScreen.classList.add('hidden');
    if (params.has('interior')) {
      const loc = locations.find((l) => l.interior === params.get('interior'));
      if (loc) enterInterior(loc, true);
    }
    controls.player.remove(camera); // free camera from the player rig
    stage.scene.remove(controls.player);
    if (params.get('cam') === 'aerial') {
      stage.scene.fog = null;
      camera.position.set(0, 95, 105);
      camera.lookAt(0, 0, 0);
    } else {
      const [x = 0, z = 20, yaw = 0, pitch = 0] = (params.get('at') || '').split(',').map(Number);
      camera.position.set(x, stage.groundHeight(x, z) + 1.7, z);
      camera.rotation.order = 'YXZ';
      camera.rotation.y = yaw;
      camera.rotation.x = pitch;
    }
    if (params.has('panel')) {
      const loc = locationById.get(params.get('panel'));
      if (loc) ui.showLocation(loc);
    }
    if (params.has('dialog')) {
      const h = stage.hotspots.find((s) => s.id === params.get('dialog'));
      if (h) ui.showDialog(h.npc);
    }
  } else {
    startScreen.addEventListener('click', () => {
      startScreen.classList.add('hidden');
      crosshair.classList.remove('hidden');
      started = true;
      controls.enabled = true;
      controls.lock();
    });
    document.addEventListener('pointerlockchange', () => {
      if (!controls.isLocked() && started) {
        controls.enabled = false;
        startPrompt.textContent = 'Click to continue';
        startScreen.classList.remove('hidden');
        crosshair.classList.add('hidden');
      } else if (controls.isLocked()) {
        controls.enabled = !ui.modalOpen;
      }
    });
  }

  window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
  });

  const projected = new THREE.Vector3();
  function project(h) {
    projected.set(h.x, h.labelY ?? stage.groundHeight(h.x, h.z) + 2.2, h.z).project(camera);
    return {
      visible: projected.z < 1 && Math.abs(projected.x) < 1 && Math.abs(projected.y) < 1,
      x: (projected.x * 0.5 + 0.5) * window.innerWidth,
      y: (-projected.y * 0.5 + 0.5) * window.innerHeight,
    };
  }

  function hotspotName(h) {
    if (h.kind === 'npc') return h.name;
    if (h.kind === 'exit') return 'Back to town';
    const loc = locationById.get(h.id);
    return loc ? loc.name : h.id;
  }

  // read-only handle for console poking and automated playtests
  window.__phandalin = {
    get pos() { const p = controls.player.position; return { x: p.x, y: p.y, z: p.z }; },
    get yaw() { return controls.yaw; },
    get hotspot() { return currentHotspot && { kind: currentHotspot.kind, id: currentHotspot.id }; },
    get stage() { return stage === townStage ? 'town' : stage.locationId; },
    get modal() { return ui.modalOpen; },
    get locked() { return controls.isLocked(); },
  };

  const clock = new THREE.Clock();
  // adaptive resolution: software renderers (VMs, old laptops) are
  // fill-rate bound — dropping pixel ratio is a ~3x frame-time win
  let perfFrames = 0, perfTime = 0, perfChecked = false;
  function adaptPerformance(dt) {
    if (perfChecked) return;
    perfFrames += 1;
    perfTime += dt;
    if (perfTime < 4) return;
    perfChecked = true;
    const fps = perfFrames / perfTime;
    if (fps < 24) {
      renderer.setPixelRatio(0.6);
      renderer.setSize(window.innerWidth, window.innerHeight);
      console.info(`phandalin: ${fps.toFixed(0)} fps — lowered render resolution for smoothness`);
    }
  }

  renderer.setAnimationLoop(() => {
    // generous clamp: keeps walk speed correct down to ~7 fps on weak
    // machines while still preventing teleports after a background tab
    const dt = Math.min(clock.getDelta(), 0.15);
    adaptPerformance(dt);
    const pos = debugView
      ? { x: camera.position.x, z: camera.position.z }
      : { x: controls.player.position.x, z: controls.player.position.z };
    stage.tick(dt, pos, clock.elapsedTime);
    controls.update(dt, stage);

    if (started || debugView) {
      const yaw = debugView ? camera.rotation.y : controls.yaw;
      currentHotspot = pickHotspot(pos, yaw, stage.hotspots, 4);
      ui.updateTarget(
        currentHotspot,
        currentHotspot && hotspotName(currentHotspot),
        currentHotspot && actionVerb(currentHotspot.kind),
        currentHotspot && project(currentHotspot)
      );
    }

    renderer.render(stage.scene, camera);
  });
}
