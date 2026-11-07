import test from 'node:test';
import assert from 'node:assert/strict';
import { buttonBounds, buttonPoint, buttonPreference, clampButtonPoint, createButtonPositionStore } from '../app/preferences/floatingButton.mjs';
test('dragged button stays inside the viewport and away from the bottom safe area', () => {
  const bounds = buttonBounds(390, 700, 60, 34);
  assert.deepEqual(clampButtonPoint({ x: -500, y: 900 }, bounds), { x: 10, y: 596 });
  assert.deepEqual(buttonPoint(buttonPreference({ x: 150, y: 200 }, bounds), bounds), { x: 150, y: 200 });
  assert.deepEqual(buttonPoint(null, bounds), { x: 320, y: 556 });
});
test('saved relative position adapts to different screen sizes without going offscreen', () => {
  const stored = buttonPreference({ x: 200, y: 300 }, buttonBounds(390, 700, 60));
  const bounds = buttonBounds(300, 400, 60);
  const point = buttonPoint(stored, bounds);
  assert.ok(point.x >= bounds.minX && point.x <= bounds.maxX);
  assert.ok(point.y >= bounds.minY && point.y <= bounds.maxY);
});
test('position is shared, persists across restarts and rapid writes preserve the last move', async () => {
  let saved;
  const storage = { getItem: async () => saved, setItem: async (_, value) => { saved = value; } };
  const store = createButtonPositionStore(storage);
  const events = [];
  store.subscribe(value => events.push(value));
  await Promise.all([store.save({ x: 0, y: 0.5 }), store.save({ x: 1, y: 0.4 })]);
  assert.equal(events.length, 2);
  assert.deepEqual(await createButtonPositionStore(storage).load(), { x: 1, y: 0.4 });
});
test('late preference loading cannot override a position the user has just dragged', async () => {
  let resolveRead;
  const store = createButtonPositionStore({ getItem: () => new Promise(resolve => { resolveRead = resolve; }), setItem: async () => {} });
  const load = store.load();
  await store.save({ x: 0.2, y: 0.3 });
  resolveRead('{"x":1,"y":1}');
  await load;
  assert.deepEqual(store.snapshot(), { x: 0.2, y: 0.3 });
});
