import * as THREE from 'three';
import { buildWorld } from './world.js';
import { assembleTown } from './buildings.js';
import { createControls } from './controls.js';
import { createUI } from './ui.js';
import { pickHotspot, actionVerb } from './interact.js';
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
  boot();
}

function boot() {
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(70, window.innerWidth / window.innerHeight, 0.1, 500);

  const world = buildWorld(scene);
  const town = assembleTown(scene, world.groundHeight);
  const locationById = new Map(locations.map((l) => [l.id, l]));

  // the active "stage" — town now, an interior after walking through a door
  const active = {
    scene,
    camera,
    colliders: [...world.colliders, ...town.colliders],
    bounds: world.bounds,
    groundHeight: world.groundHeight,
    hotspots: town.hotspots,
    tick: (dt) => world.tick(dt),
  };

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

  function activateHotspot(h) {
    if (!h) return;
    if (h.kind === 'location' || h.kind === 'enter') {
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
    controls.player.remove(camera); // free camera from the player rig
    scene.remove(controls.player);
    if (params.get('cam') === 'aerial') {
      scene.fog = null;
      camera.position.set(0, 95, 105);
      camera.lookAt(0, 0, 0);
    } else {
      const [x = 0, z = 20, yaw = 0, pitch = 0] = (params.get('at') || '').split(',').map(Number);
      camera.position.set(x, world.groundHeight(x, z) + 1.7, z);
      camera.rotation.order = 'YXZ';
      camera.rotation.y = yaw;
      camera.rotation.x = pitch;
    }
    if (params.has('panel')) {
      const loc = locationById.get(params.get('panel'));
      if (loc) ui.showLocation(loc);
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
    projected.set(h.x, h.labelY ?? world.groundHeight(h.x, h.z) + 2.2, h.z).project(camera);
    return {
      visible: projected.z < 1 && Math.abs(projected.x) < 1 && Math.abs(projected.y) < 1,
      x: (projected.x * 0.5 + 0.5) * window.innerWidth,
      y: (-projected.y * 0.5 + 0.5) * window.innerHeight,
    };
  }

  function hotspotName(h) {
    if (h.kind === 'npc') return h.name;
    const loc = locationById.get(h.id);
    return loc ? loc.name : h.id;
  }

  const clock = new THREE.Clock();
  renderer.setAnimationLoop(() => {
    const dt = Math.min(clock.getDelta(), 0.05);
    active.tick(dt);
    controls.update(dt, active);

    if (started || debugView) {
      const pos = debugView
        ? { x: camera.position.x, z: camera.position.z }
        : { x: controls.player.position.x, z: controls.player.position.z };
      const yaw = debugView ? camera.rotation.y : controls.yaw;
      currentHotspot = pickHotspot(pos, yaw, active.hotspots, 4);
      ui.updateTarget(
        currentHotspot,
        currentHotspot && hotspotName(currentHotspot),
        currentHotspot && actionVerb(currentHotspot.kind),
        currentHotspot && project(currentHotspot)
      );
    }

    renderer.render(active.scene, active.camera);
  });
}
