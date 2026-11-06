import test from 'node:test';
import assert from 'node:assert/strict';
import { normalizeSectionOrder, moveSection, dropSection } from '../app/stats/sectionOrder.mjs';

test('saved ordering survives serialization; missing or corrupt values recover all sections', () => {
  const order = moveSection(['vfr', 'ifr', 'type'], 'type', 0);
  assert.deepEqual(normalizeSectionOrder(JSON.parse(JSON.stringify(order))), ['type', 'vfr', 'ifr']);
  assert.deepEqual(normalizeSectionOrder(['ifr', 'ifr', 'unknown']), ['ifr', 'vfr', 'type']);
  assert.deepEqual(normalizeSectionOrder(null), ['vfr', 'ifr', 'type']);
});
test('drag positions reorder above and below measured section headers', () => {
  const order = ['vfr', 'ifr', 'type'];
  const layouts = { vfr: { y: 0 }, ifr: { y: 200 }, type: { y: 400 } };
  assert.deepEqual(dropSection(order, 'type', 0, layouts), ['type', 'vfr', 'ifr']);
  assert.deepEqual(dropSection(order, 'vfr', 500, layouts), ['ifr', 'type', 'vfr']);
  assert.deepEqual(dropSection(order, 'ifr', 224, layouts), order);
});
test('hidden sections retain their saved positions and boundary moves remain safe', () => {
  assert.deepEqual(dropSection(['vfr', 'ifr', 'type'], 'type', 0, { ifr: { y: 0 }, type: { y: 200 } }), ['vfr', 'type', 'ifr']);
  assert.deepEqual(moveSection(['vfr', 'ifr', 'type'], 'vfr', -1), ['vfr', 'ifr', 'type']);
  assert.deepEqual(moveSection(['vfr', 'ifr', 'type'], 'type', 20), ['vfr', 'ifr', 'type']);
});
