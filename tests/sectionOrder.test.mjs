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

test('live preview shifts neighbors out of the dragged cards slot before release', async () => {
  const { sectionPreview } = await import('../app/stats/sectionOrder.mjs');
  const layouts = { vfr: { y: 0, height: 200 }, ifr: { y: 200, height: 100 }, type: { y: 300, height: 80 } };
  const down = sectionPreview(['vfr', 'ifr', 'type'], 'vfr', 350, layouts);
  assert.deepEqual(down.order, ['ifr', 'type', 'vfr']);
  assert.deepEqual(down.offsets, { ifr: -200, type: -200, vfr: 0 });
  const up = sectionPreview(['vfr', 'ifr', 'type'], 'type', 0, layouts);
  assert.deepEqual(up.offsets, { type: 0, vfr: 80, ifr: 80 });
  const unchanged = sectionPreview(['vfr', 'ifr', 'type'], 'ifr', 224, layouts);
  assert.deepEqual(unchanged.offsets, { vfr: 0, ifr: 0, type: 0 });
});
