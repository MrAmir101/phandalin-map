import * as THREE from 'three';

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

  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x9fc7e8);

  const camera = new THREE.PerspectiveCamera(70, window.innerWidth / window.innerHeight, 0.1, 400);
  camera.position.set(0, 8, 18);
  camera.lookAt(0, 0, 0);

  scene.add(new THREE.HemisphereLight(0xcfe3f2, 0x6a7a4d, 0.9));
  const sun = new THREE.DirectionalLight(0xfff2d8, 1.4);
  sun.position.set(50, 80, -30);
  scene.add(sun);

  const ground = new THREE.Mesh(
    new THREE.PlaneGeometry(60, 60),
    new THREE.MeshStandardMaterial({ color: 0x8fae6a, flatShading: true, roughness: 1 })
  );
  ground.rotation.x = -Math.PI / 2;
  scene.add(ground);

  const box = new THREE.Mesh(
    new THREE.BoxGeometry(2, 2, 2),
    new THREE.MeshStandardMaterial({ color: 0xa8442e, flatShading: true, roughness: 1 })
  );
  box.position.y = 1;
  scene.add(box);

  window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
  });

  renderer.setAnimationLoop((t) => {
    box.rotation.y = t / 1000;
    renderer.render(scene, camera);
  });
}
