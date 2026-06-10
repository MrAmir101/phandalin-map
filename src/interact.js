// Pure interaction picking — no DOM, no three.js, unit-testable.
// A hotspot is { kind, id, x, z, ... }. The player faces along
// forward = (-sin yaw, -cos yaw); a hotspot is pickable when it is within
// range and roughly ahead, or close enough to be at the player's feet.

const FACING_DOT = 0.35;
const POINT_BLANK = 1.4;

export function pickHotspot(pos, yaw, hotspots, range = 3.5) {
  const fx = -Math.sin(yaw), fz = -Math.cos(yaw);
  let best = null;
  let bestDist = Infinity;
  for (const h of hotspots) {
    const dx = h.x - pos.x, dz = h.z - pos.z;
    const dist = Math.hypot(dx, dz);
    if (dist > range || dist >= bestDist) continue;
    if (dist > POINT_BLANK) {
      const dot = (dx * fx + dz * fz) / dist;
      if (dot < FACING_DOT) continue;
    }
    best = h;
    bestDist = dist;
  }
  return best;
}

export function actionVerb(kind) {
  return { enter: 'Enter', exit: 'Leave', npc: 'Talk', location: 'Look around' }[kind];
}
