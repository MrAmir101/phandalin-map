import * as THREE from 'three';
import { buildWorld } from './world.js';
import { assembleTown } from './buildings.js';
import { createControls } from './controls.js';

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

  const env = {
    colliders: [...world.colliders, ...town.colliders],
    bounds: world.bounds,
    groundHeight: world.groundHeight,
  };

  const controls = createControls(camera, scene, canvas);
  // arrive on the Triboar Trail, looking down the road into town
  controls.placeAt(-68, -59, -2.2, world.groundHeight);

  const startScreen = document.getElementById('start-screen');
  const startPrompt = document.getElementById('start-prompt');
  const crosshair = document.getElementById('crosshair');

  // --- debug cameras for development screenshots ---
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
  } else {
    startScreen.addEventListener('click', () => {
      startScreen.classList.add('hidden');
      crosshair.classList.remove('hidden');
      controls.enabled = true;
      controls.lock();
    });
    document.addEventListener('pointerlockchange', () => {
      if (!controls.isLocked() && controls.enabled) {
        controls.enabled = false;
        startPrompt.textContent = 'Click to continue';
        startScreen.classList.remove('hidden');
        crosshair.classList.add('hidden');
      } else if (controls.isLocked()) {
        controls.enabled = true;
      }
    });
  }

  window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
  });

  const clock = new THREE.Clock();
  renderer.setAnimationLoop(() => {
    const dt = Math.min(clock.getDelta(), 0.05);
    world.tick(dt);
    controls.update(dt, env);
    renderer.render(scene, camera);
  });
}
