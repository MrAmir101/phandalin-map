import * as THREE from 'three';
import { npcs } from '../data/npcs.js';
import { mat } from './world.js';

// Procedural townsfolk: a low-poly body, head, hair or hood, and simple
// idle/wander behavior. Named NPCs are interactable; villagers just wander.

function makePerson(look) {
  const g = new THREE.Group();
  const scale = look.child ? 0.62 : 1;

  const body = new THREE.Mesh(
    new THREE.CylinderGeometry(0.26, look.hood ? 0.4 : 0.36, 1.05, 7),
    mat(look.body)
  );
  body.position.y = 0.62;
  body.castShadow = true;
  g.add(body);

  const head = new THREE.Mesh(new THREE.SphereGeometry(0.21, 7, 6), mat(look.head));
  head.position.y = 1.36;
  head.castShadow = true;
  g.add(head);

  if (look.hood) {
    const hood = new THREE.Mesh(new THREE.ConeGeometry(0.3, 0.58, 7), mat(look.body));
    hood.position.y = 1.46;
    g.add(hood);
  } else if (look.hair != null) {
    const hair = new THREE.Mesh(new THREE.SphereGeometry(0.22, 7, 5), mat(look.hair));
    hair.position.y = 1.42;
    hair.scale.set(1, 0.62, 1);
    g.add(hair);
  }

  for (const sx of [-1, 1]) {
    const arm = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.07, 0.75, 5), mat(look.body));
    arm.position.set(sx * 0.34, 0.78, 0);
    arm.rotation.z = sx * 0.18;
    g.add(arm);
  }

  g.scale.setScalar(scale);
  return g;
}

export function spawnNpcs(scene, sceneId, groundHeight) {
  const list = [];
  const hotspots = [];

  for (const data of npcs.filter((n) => n.scene === sceneId)) {
    const mesh = makePerson(data.look);
    const [x, z] = data.position;
    const y = groundHeight ? groundHeight(x, z) : 0;
    mesh.position.set(x, y, z);
    mesh.rotation.y = data.facing;
    scene.add(mesh);

    const npc = {
      data, mesh,
      baseYaw: data.facing,
      bobPhase: Math.abs(x * 7 + z * 13) % 6.28,
      waypoints: data.waypoints || null,
      wpIndex: 1,
    };
    list.push(npc);

    if (data.lines.length) {
      hotspots.push({
        kind: 'npc', id: data.id, name: data.name, npc: data,
        x, z, labelY: y + (data.look.child ? 1.35 : 1.95),
      });
    }
  }

  function tick(dt, playerPos, t) {
    for (const n of list) {
      if (n.waypoints) {
        // wander a fixed loop at a stroll
        const [tx, tz] = n.waypoints[n.wpIndex];
        const dx = tx - n.mesh.position.x, dz = tz - n.mesh.position.z;
        const dist = Math.hypot(dx, dz);
        if (dist < 0.4) {
          n.wpIndex = (n.wpIndex + 1) % n.waypoints.length;
        } else {
          const speed = 1.2 * dt;
          n.mesh.position.x += (dx / dist) * speed;
          n.mesh.position.z += (dz / dist) * speed;
          if (groundHeight) n.mesh.position.y = groundHeight(n.mesh.position.x, n.mesh.position.z);
          const targetYaw = Math.atan2(dx, dz);
          n.mesh.rotation.y += angleDelta(n.mesh.rotation.y, targetYaw) * Math.min(1, dt * 6);
        }
      } else if (playerPos) {
        // idle: turn toward a nearby player, drift back when alone
        const dx = playerPos.x - n.mesh.position.x;
        const dz = playerPos.z - n.mesh.position.z;
        const dist = Math.hypot(dx, dz);
        const targetYaw = dist < 5 ? Math.atan2(dx, dz) : n.baseYaw;
        n.mesh.rotation.y += angleDelta(n.mesh.rotation.y, targetYaw) * Math.min(1, dt * 4);
      }
      // subtle breathing
      const s = n.data.look.child ? 0.62 : 1;
      n.mesh.scale.y = s * (1 + Math.sin(t * 2.1 + n.bobPhase) * 0.012);
    }
  }

  return { hotspots, tick };
}

function angleDelta(from, to) {
  let d = (to - from) % (Math.PI * 2);
  if (d > Math.PI) d -= Math.PI * 2;
  if (d < -Math.PI) d += Math.PI * 2;
  return d;
}
