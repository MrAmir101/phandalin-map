import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';

// GLTF model loading and placement for the KayKit packs.
// All models are preloaded once behind the start screen; after that every
// helper here is synchronous. Clones share geometry and materials, so a
// town of ~150 placements costs one geometry/material per model file.

const loader = new GLTFLoader();
const cache = new Map();      // path -> template scene (Group)
const tintCache = new Map();  // materialUuid:tint -> tinted material clone

export async function preloadModels(paths) {
  await Promise.all([...new Set(paths)].map(async (path) => {
    if (cache.has(path)) return;
    const gltf = await loader.loadAsync(path);
    const root = gltf.scene;
    stripHexBase(root);
    root.traverse((o) => {
      if (o.isMesh) {
        o.castShadow = true;
        o.receiveShadow = true;
      }
    });
    cache.set(path, root);
  }));
}

// The hexagon-pack buildings ship without separate hex ground tiles (the
// terrain tiles live in assets/hexagon/tiles/), but guard against base
// nodes anyway in case other packs sneak one in.
export function stripHexBase(root) {
  root.traverse((o) => {
    if (/hex(agon)?[_-]?(base|tile|ground)/i.test(o.name)) o.visible = false;
  });
}

export function cloneModel(path) {
  const tpl = cache.get(path);
  if (!tpl) throw new Error(`model not preloaded: ${path}`);
  return tpl.clone(true);
}

function tintedMaterial(material, tint) {
  const key = `${material.uuid}:${tint}`;
  if (!tintCache.has(key)) {
    const m = material.clone();
    m.color = m.color.clone().multiply(new THREE.Color(tint));
    tintCache.set(key, m);
  }
  return tintCache.get(key);
}

// Clone a model into `parent` at world (x, y, z) with uniform `scale` and
// yaw `rotY`. `sink` lowers it into the ground so the baked-in stone plinth
// edge meets the terrain. `tint` multiplies a cloned material (used to
// dirty up the Sleeping Giant).
export function placeModel(parent, path, { x = 0, y = 0, z = 0, rotY = 0, scale = 1, sink = 0, tint = null } = {}) {
  const obj = cloneModel(path);
  obj.scale.setScalar(scale);
  obj.rotation.y = rotY;
  obj.position.set(x, y - sink, z);
  if (tint) {
    obj.traverse((o) => {
      if (o.isMesh) o.material = tintedMaterial(o.material, tint);
    });
  }
  parent.add(obj);
  return obj;
}

// First mesh's geometry (with its node transform baked in) + material —
// the raw ingredients for an InstancedMesh.
export function meshData(path) {
  const tpl = cache.get(path);
  if (!tpl) throw new Error(`model not preloaded: ${path}`);
  tpl.updateWorldMatrix(true, true);
  let result = null;
  tpl.traverse((o) => {
    if (!result && o.isMesh) {
      const geometry = o.geometry.clone();
      geometry.applyMatrix4(o.matrixWorld);
      result = { geometry, material: o.material };
    }
  });
  return result;
}

export function boxOf(obj) {
  return new THREE.Box3().setFromObject(obj);
}
