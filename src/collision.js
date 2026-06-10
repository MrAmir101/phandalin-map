// Pure 2D (x/z) collision resolution against axis-aligned boxes.
// Movement that would land inside a box keeps whichever axis components
// remain free, producing a wall slide instead of a dead stop.

function hits(x, z, r, boxes) {
  for (const b of boxes) {
    if (x > b.minX - r && x < b.maxX + r && z > b.minZ - r && z < b.maxZ + r) return true;
  }
  return false;
}

export function resolveMovement(pos, delta, radius, boxes, bounds) {
  let x = pos.x + delta.x;
  let z = pos.z + delta.z;
  if (hits(x, z, radius, boxes)) {
    if (!hits(x, pos.z, radius, boxes)) {
      z = pos.z;
    } else if (!hits(pos.x, z, radius, boxes)) {
      x = pos.x;
    } else {
      x = pos.x;
      z = pos.z;
    }
  }
  if (bounds) {
    x = Math.min(bounds.maxX - radius, Math.max(bounds.minX + radius, x));
    z = Math.min(bounds.maxZ - radius, Math.max(bounds.minZ + radius, z));
  }
  return { x, z };
}
