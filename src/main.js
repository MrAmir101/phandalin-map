import * as THREE from 'three';
import { buildWorld } from './world.js';
import { assembleTown } from './buildings.js';

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

  // debug views for development screenshots: ?cam=aerial or ?at=x,z,yaw
  const params = new URLSearchParams(location.search);
  if (params.has('cam') || params.has('at')) {
    document.getElementById('start-screen').classList.add('hidden');
    if (params.get('cam') === 'aerial') {
      scene.fog = null; // see the whole town in debug shots
      camera.position.set(0, 95, 105);
      camera.lookAt(0, 0, 0);
    } else {
      const [x = 0, z = 20, yaw = 0] = (params.get('at') || '').split(',').map(Number);
      camera.position.set(x, world.groundHeight(x, z) + 1.7, z);
      camera.rotation.order = 'YXZ';
      camera.rotation.y = yaw;
    }
  } else {
    camera.position.set(-20, world.groundHeight(-20, -35) + 1.7, -35);
    camera.lookAt(0, 2, 0);
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
    renderer.render(scene, camera);
  });
}
