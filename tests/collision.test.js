import { test } from 'node:test';
import assert from 'node:assert/strict';
import { resolveMovement } from '../src/collision.js';

const box = { minX: -1, maxX: 1, minZ: -1, maxZ: 1 };

test('free movement passes through empty space', () => {
  assert.deepEqual(
    resolveMovement({ x: 5, z: 5 }, { x: 1, z: 0 }, 0.5, [box]),
    { x: 6, z: 5 }
  );
});

test('blocked head-on by AABB expanded by player radius', () => {
  const p = resolveMovement({ x: -3, z: 0 }, { x: 2, z: 0 }, 0.5, [box]);
  assert.ok(p.x <= -1.5 + 1e-9, `stopped at wall, got x=${p.x}`);
  assert.equal(p.z, 0);
});

test('slides along wall when moving diagonally into it', () => {
  const p = resolveMovement({ x: -2, z: 0 }, { x: 1, z: 0.5 }, 0.5, [box]);
  assert.equal(p.z, 0.5);
  assert.ok(p.x <= -1.5 + 1e-9, `x clamped at wall, got x=${p.x}`);
});

test('fully cornered movement stays put', () => {
  const boxes = [
    { minX: 0.6, maxX: 2, minZ: -2, maxZ: 2 },   // wall east
    { minX: -2, maxX: 2, minZ: 0.6, maxZ: 2 },   // wall south
  ];
  const p = resolveMovement({ x: 0, z: 0 }, { x: 0.5, z: 0.5 }, 0.5, boxes);
  assert.deepEqual(p, { x: 0, z: 0 });
});

test('clamps to world bounds', () => {
  const p = resolveMovement(
    { x: 99, z: 0 }, { x: 5, z: 0 }, 0.5, [],
    { minX: -100, maxX: 100, minZ: -95, maxZ: 95 }
  );
  assert.ok(p.x <= 100 - 0.5 + 1e-9);
});
