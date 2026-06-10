import * as THREE from 'three';
import { npcs } from '../data/npcs.js';
import { cloneCharacter, animationsOf } from './assets.js';

// KayKit Adventurers townsfolk. Each NPC is a SkeletonUtils clone of one of
// the five rigged character GLBs, with unwanted prop meshes hidden, cloth
// meshes tinted per data/npcs.js, and a per-instance AnimationMixer playing
// a named idle or walk clip. Casting follows the pack survey in docs/.

const CHAR_DIR = 'assets/adventurers/characters/';

// height: native bind-pose bbox height (incl. headgear); bare: without the
// hat/helmet (most casts hide it — used for label placement); scale: world
// scale. Chibi proportions put the eye line low (~60% of height), so humans
// run ~2.0 m tall to read right against the player's 1.7 m eye height.
const MODELS = {
  barbarian:      { file: 'Barbarian.glb',    height: 2.557, bare: 2.05, scale: 0.78 },
  knight:         { file: 'Knight.glb',       height: 2.629, bare: 2.15, scale: 0.76 },
  mage:           { file: 'Mage.glb',         height: 3.177, bare: 2.2,  scale: 0.70 },
  rogue:          { file: 'Rogue.glb',        height: 1.786, bare: 1.79, scale: 0.95 },
  'rogue-hooded': { file: 'Rogue_Hooded.glb', height: 1.786, bare: 1.79, scale: 1.02 },
};

export const NPC_MODELS = Object.values(MODELS).map((m) => CHAR_DIR + m.file);

const IDLE_CLIP = 'Idle';
const VILLAGER_IDLE_CLIP = 'Unarmed_Idle';
const WALK_CLIP = 'Walking_A';

// Every GLB ships with ALL prop meshes visible at once (weapons, shields,
// headgear, mug, spellbooks...). Body parts always stay; everything else is
// hidden unless the NPC's show-list names it.
const BODY_MESH = /_(ArmLeft|ArmRight|Body|Head|Head_Hooded|LegLeft|LegRight)$/;
// Cloth meshes that take the per-NPC tint (skin meshes — Head, Arms — stay
// on the shared untinted material).
const TINT_MESH = /(_Body|_LegLeft|_LegRight|_Cape|_Hat|_Head_Hooded)$/;

function showList(id) {
  if (id.startsWith('redbrand')) return ['Knife', 'Rogue_Cape']; // scarlet cloak + blade
  switch (id) {
    case 'toblen': return ['Mug'];                       // innkeeper mid-pour
    case 'grista': return ['Mug'];                       // barkeep
    case 'linene': return ['Knight_Cape', 'Rectangle_Shield']; // arms dealer flavor
    case 'daran': return ['Knight_Cape'];                // retired marshal
    case 'villager-3': return ['Barbarian_Hat'];         // hat stays, weapons go
    default: return [];
  }
}

// The rogue atlas hood/cape green (15,131,69) has almost no red channel, so
// no multiplicative tint can make a Redbrand cloak scarlet. Instead the
// Redbrands share one canvas-recolored copy of the atlas with every green
// block hue-swapped to scarlet; their data tint becomes a subtle per-thug
// shade variation.
let scarletTex = null;
function scarletTexture(src) {
  if (scarletTex) return scarletTex;
  const img = src.image;
  const canvas = document.createElement('canvas');
  canvas.width = img.width;
  canvas.height = img.height;
  const ctx = canvas.getContext('2d');
  ctx.drawImage(img, 0, 0);
  const data = ctx.getImageData(0, 0, canvas.width, canvas.height);
  const p = data.data;
  for (let i = 0; i < p.length; i += 4) {
    const r = p[i], g = p[i + 1], b = p[i + 2];
    if (g > r * 1.4 && g > b * 0.9) { // green/teal cloth block -> scarlet
      p[i] = g;
      p[i + 1] = Math.round(r * 0.3);
      p[i + 2] = Math.round(b * 0.35);
    }
  }
  ctx.putImageData(data, 0, 0);
  scarletTex = new THREE.CanvasTexture(canvas);
  scarletTex.flipY = src.flipY;
  scarletTex.colorSpace = src.colorSpace;
  scarletTex.wrapS = src.wrapS;
  scarletTex.wrapT = src.wrapT;
  scarletTex.magFilter = src.magFilter;
  scarletTex.minFilter = src.minFilter;
  scarletTex.generateMipmaps = src.generateMipmaps;
  return scarletTex;
}

function applyLook(root, data) {
  const show = showList(data.id);
  const scarlet = data.id.startsWith('redbrand');
  let tinted = null; // one cloned material per NPC, shared by its cloth meshes
  let cloak = null;  // redbrands: recolored-atlas material for the whole body
  root.traverse((o) => {
    if (!o.isMesh && !o.isSkinnedMesh) return;
    if (!BODY_MESH.test(o.name) && !show.includes(o.name)) {
      o.visible = false;
      return;
    }
    if (scarlet) {
      if (!cloak) {
        cloak = o.material.clone();
        cloak.map = scarletTexture(o.material.map);
        if (data.tint != null) {
          // mostly-white multiplier: varies the cloak shade without
          // flushing the skin red
          cloak.color = new THREE.Color(data.tint).lerp(new THREE.Color(0xffffff), 0.8);
        }
      }
      o.material = cloak;
    } else if (data.tint != null && TINT_MESH.test(o.name)) {
      if (!tinted) {
        tinted = o.material.clone();
        tinted.color = tinted.color.clone().multiply(new THREE.Color(data.tint));
      }
      o.material = tinted;
    }
  });
}

export function spawnNpcs(scene, sceneId, groundHeight) {
  const list = [];
  const hotspots = [];

  for (const data of npcs.filter((n) => n.scene === sceneId)) {
    const meta = MODELS[data.model] || MODELS.rogue;
    const mesh = cloneCharacter(CHAR_DIR + meta.file);
    applyLook(mesh, data);

    const [x, z] = data.position;
    // deterministic ±4% size jitter so repeated casts don't read as clones
    const jitter = 1 + ((Math.abs(Math.round(x * 13 + z * 7)) % 9) - 4) * 0.01;
    const scale = meta.scale * jitter * (data.look.child ? 0.62 : 1);
    mesh.scale.setScalar(scale);

    const y = (groundHeight ? groundHeight(x, z) : 0) + (data.y || 0);
    mesh.position.set(x, y, z);
    mesh.rotation.y = data.facing;
    scene.add(mesh);

    const clips = animationsOf(CHAR_DIR + meta.file);
    const mixer = new THREE.AnimationMixer(mesh);
    const clipName = data.waypoints
      ? WALK_CLIP
      : (data.id.startsWith('villager') ? VILLAGER_IDLE_CLIP : IDLE_CLIP);
    const clip = THREE.AnimationClip.findByName(clips, clipName);
    if (clip) {
      const action = mixer.clipAction(clip);
      action.play();
      // random start offset so idlers don't sway in sync
      action.time = (Math.abs(x * 7 + z * 13) % clip.duration);
    }

    const npc = {
      data, mesh, mixer,
      baseYaw: data.facing,
      waypoints: data.waypoints || null,
      wpIndex: 1,
    };
    list.push(npc);

    if (data.lines.length) {
      hotspots.push({
        kind: 'npc', id: data.id, name: data.name, npc: data,
        x, z, labelY: y + meta.bare * scale + 0.4,
      });
    }
  }

  function tick(dt, playerPos, t) {
    for (const n of list) {
      n.mixer.update(dt);
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
