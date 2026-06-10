import { test } from 'node:test';
import assert from 'node:assert/strict';
import { pickHotspot, actionVerb } from '../src/interact.js';

// yaw 0 faces -Z: forward = (-sin yaw, -cos yaw)
const spots = [
  { id: 'ahead', x: 0, z: -3 },
  { id: 'far', x: 0, z: -10 },
  { id: 'behind', x: 0, z: 3 },
];

test('picks nearest hotspot within range and facing cone', () => {
  assert.equal(pickHotspot({ x: 0, z: 0 }, 0, spots, 4).id, 'ahead');
});

test('ignores hotspots behind the player', () => {
  const onlyBehind = [{ id: 'behind', x: 0, z: 3 }];
  assert.equal(pickHotspot({ x: 0, z: 0 }, 0, onlyBehind, 4), null);
});

test('very close hotspots count even when not faced', () => {
  const atFeet = [{ id: 'feet', x: 0.3, z: 0.8 }];
  assert.equal(pickHotspot({ x: 0, z: 0 }, 0, atFeet, 4).id, 'feet');
});

test('returns null when nothing in range', () => {
  assert.equal(pickHotspot({ x: 50, z: 50 }, 0, spots, 4), null);
});

test('prefers the nearer of two valid hotspots', () => {
  const two = [
    { id: 'near', x: 0, z: -2 },
    { id: 'farther', x: 0.5, z: -3.5 },
  ];
  assert.equal(pickHotspot({ x: 0, z: 0 }, 0, two, 4).id, 'near');
});

test('actionVerb maps hotspot kinds to hints', () => {
  assert.equal(actionVerb('enter'), 'Enter');
  assert.equal(actionVerb('exit'), 'Leave');
  assert.equal(actionVerb('npc'), 'Talk');
  assert.equal(actionVerb('location'), 'Look around');
});
