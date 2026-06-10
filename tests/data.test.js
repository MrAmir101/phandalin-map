import { test } from 'node:test';
import assert from 'node:assert/strict';
import { locations } from '../data/locations.js';
import { npcs } from '../data/npcs.js';

test('exactly 10 locations with unique ids', () => {
  assert.equal(locations.length, 10);
  assert.equal(new Set(locations.map(l => l.id)).size, 10);
});

test('every location has required content fields', () => {
  for (const l of locations) {
    assert.ok(l.name && l.blurb, l.id);
    assert.ok(Array.isArray(l.position) && l.position.length === 2, l.id);
    assert.ok(l.description.length >= 1 && l.description.every(p => p.length > 40), l.id);
    assert.ok(Array.isArray(l.whoIsHere) && Array.isArray(l.services) && Array.isArray(l.rumors), l.id);
    assert.ok(l.whoIsHere.length >= 1 || l.id === 'tresendar-manor', l.id);
    assert.ok(l.rumors.length >= 1, l.id);
  }
});

test('exactly two walk-in interiors: inn and giant', () => {
  assert.deepEqual(
    locations.filter(l => l.interior).map(l => l.interior).sort(),
    ['giant', 'inn']
  );
});

test('every npc references a valid location and scene', () => {
  const ids = new Set(locations.map(l => l.id));
  for (const n of npcs) {
    assert.ok(ids.has(n.location), `${n.id} -> ${n.location}`);
    assert.ok(['town', 'inn', 'giant'].includes(n.scene), n.id);
    assert.ok(Array.isArray(n.position) && n.position.length === 2, n.id);
    assert.ok(typeof n.facing === 'number', n.id);
    assert.ok(n.look && typeof n.look.body === 'number' && typeof n.look.head === 'number', n.id);
  }
});

test('every npc casts a valid character model with an optional numeric tint', () => {
  const models = new Set(['barbarian', 'knight', 'mage', 'rogue', 'rogue-hooded']);
  for (const n of npcs) {
    assert.ok(models.has(n.model), `${n.id} -> ${n.model}`);
    if (n.tint != null) assert.equal(typeof n.tint, 'number', n.id);
  }
});

test('named npcs have dialog; villagers have waypoints', () => {
  for (const n of npcs) {
    if (n.id.startsWith('villager')) {
      assert.ok(Array.isArray(n.waypoints) && n.waypoints.length >= 2, n.id);
    } else {
      assert.ok(n.lines.length >= 3 && n.lines.every(s => s.length > 10), n.id);
    }
  }
});

test('no DM spoilers leak into player-safe text', () => {
  const all = JSON.stringify({ locations, npcs }).toLowerCase();
  for (const banned of ['glasstaff', 'iarno', 'black spider', 'nezznar', 'wave echo']) {
    assert.ok(!all.includes(banned), `spoiler found: ${banned}`);
  }
});
