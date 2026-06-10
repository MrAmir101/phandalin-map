import * as THREE from 'three';
import { resolveMovement } from './collision.js';

// Pointer-lock first-person movement. The player object carries yaw and
// position (at foot level); the camera rides inside it at eye height and
// carries pitch only.

const EYE_HEIGHT = 1.7;
const WALK_SPEED = 4.5;
const RUN_SPEED = 8;
const RADIUS = 0.5;

export function createControls(camera, scene, domElement) {
  const player = new THREE.Object3D();
  player.rotation.order = 'YXZ';
  camera.rotation.order = 'YXZ';
  camera.position.set(0, EYE_HEIGHT, 0);
  camera.rotation.set(0, 0, 0);
  player.add(camera);
  scene.add(player);

  const keys = new Set();
  const controls = {
    player,
    enabled: false,
    get yaw() { return player.rotation.y; },
    set yaw(v) { player.rotation.y = v; },
    isLocked: () => document.pointerLockElement === domElement,
    lock: () => domElement.requestPointerLock(),
    unlock: () => document.exitPointerLock(),
    placeAt(x, z, yaw, groundHeight) {
      player.position.set(x, groundHeight ? groundHeight(x, z) : 0, z);
      player.rotation.y = yaw;
      camera.rotation.x = 0;
    },
    update(dt, env) {
      if (!controls.enabled) return;
      let mx = 0, mz = 0;
      if (keys.has('KeyW') || keys.has('ArrowUp')) mz -= 1;
      if (keys.has('KeyS') || keys.has('ArrowDown')) mz += 1;
      if (keys.has('KeyA') || keys.has('ArrowLeft')) mx -= 1;
      if (keys.has('KeyD') || keys.has('ArrowRight')) mx += 1;
      if (!mx && !mz) return;
      const len = Math.hypot(mx, mz);
      const speed = (keys.has('ShiftLeft') || keys.has('ShiftRight')) ? RUN_SPEED : WALK_SPEED;
      const yaw = player.rotation.y;
      // rotate local (mx, mz) by yaw into world space
      const dx = (mx * Math.cos(yaw) + mz * Math.sin(yaw)) / len * speed * dt;
      const dz = (-mx * Math.sin(yaw) + mz * Math.cos(yaw)) / len * speed * dt;
      const next = resolveMovement(
        { x: player.position.x, z: player.position.z },
        { x: dx, z: dz }, RADIUS, env.colliders, env.bounds
      );
      player.position.x = next.x;
      player.position.z = next.z;
      if (env.groundHeight) {
        const target = env.groundHeight(next.x, next.z);
        player.position.y += (target - player.position.y) * Math.min(1, dt * 12);
      }
    },
  };

  document.addEventListener('mousemove', (e) => {
    if (!controls.isLocked() || !controls.enabled) return;
    player.rotation.y -= e.movementX * 0.0023;
    camera.rotation.x = Math.max(
      -Math.PI / 2 * 0.94,
      Math.min(Math.PI / 2 * 0.94, camera.rotation.x - e.movementY * 0.0023)
    );
  });

  document.addEventListener('keydown', (e) => {
    if (['KeyW', 'KeyA', 'KeyS', 'KeyD', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.code)) {
      e.preventDefault();
    }
    keys.add(e.code);
  });
  document.addEventListener('keyup', (e) => keys.delete(e.code));
  window.addEventListener('blur', () => keys.clear());

  return controls;
}
