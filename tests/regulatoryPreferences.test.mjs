import test from 'node:test';
import assert from 'node:assert/strict';
import { createRegulatoryPreferences, regulatoryPreference, regulatoryHidden, regulatoryKey } from '../app/settings/regulatoryPreferences.mjs';
const now = Date.UTC(2026, 10, 30, 23, 55);
const row = { id: 4, kind: 'expiration', due_date: '2026-12-20', severity: 'warning', preference_generation: 0 };
function memory() { const values = new Map(); return { getItem: async key => values.get(key) ?? null, setItem: async (key, value) => values.set(key, value) }; }

test('yellow returns at red; red dismissal lasts 30 UTC dates; snooze allows 1/3/7/14', () => {
  const pref = regulatoryPreference(row, 'dismiss', null, now);
  assert.equal(pref.mode, 'until_red');
  assert.equal(regulatoryHidden(pref, row, now), true);
  assert.equal(regulatoryHidden(pref, { ...row, severity: 'danger' }, now), false);
  const snooze = regulatoryPreference(row, 'snooze', 3, now);
  assert.equal(snooze.until, '2026-12-03');
  assert.equal(regulatoryHidden(snooze, row, Date.UTC(2026, 11, 2, 23, 59)), true);
  assert.equal(regulatoryHidden(snooze, row, Date.UTC(2026, 11, 3)), false);
  assert.equal(regulatoryHidden(snooze, { ...row, severity: 'danger' }, now), false);
  assert.equal(regulatoryPreference({ ...row, severity: 'danger' }, 'dismiss', null, now).until, '2026-12-30');
  assert.throws(() => regulatoryPreference(row, 'snooze', 30, now));
  assert.notEqual(regulatoryKey({ kind: 'ipc', category: 'airplane' }), regulatoryKey({ kind: 'ipc', category: 'helicopter' }));
});
test('offline actions survive restart and retain absolute dates on retry without leaking accounts', async () => {
  const disk = memory();
  const offline = createRegulatoryPreferences(disk, async () => { throw Error('offline'); });
  await offline.set('owner', row, 'snooze', 7, now);
  await assert.rejects(offline.sync('owner'));
  const calls = [];
  const queue = createRegulatoryPreferences(disk, async (scope, operation) => {
    calls.push(operation);
    return { preferences: { [operation.key]: { ...operation, mode: 'until' } }, generations: {} };
  });
  assert.equal((await queue.read('owner')).preferences['regulatory:4'].until, '2026-12-07');
  await queue.sync('owner');
  assert.equal(calls[0].until, '2026-12-07');
  assert.deepEqual((await queue.read('owner')).pending, {});
  assert.deepEqual((await queue.read('other')).preferences, {});
});
test('Restore queued while Dismiss uploads wins locally and reaches the account', async () => {
  let release;
  const calls = [];
  const queue = createRegulatoryPreferences(memory(), async (scope, operation) => {
    calls.push(operation);
    if (calls.length === 1) await new Promise(resolve => { release = resolve; });
    return { preferences: operation.action === 'restore' ? {} : { [operation.key]: { mode: 'until_red' } }, generations: {} };
  });
  await queue.set('owner', row, 'dismiss', null, now);
  const sync = queue.sync('owner');
  while (!release) await new Promise(resolve => setTimeout(resolve, 0));
  await queue.set('owner', row, 'restore', null, now);
  release(); await sync;
  assert.deepEqual(calls.map(item => item.action), ['dismiss', 'restore']);
  assert.deepEqual((await queue.read('owner')).preferences, {});
});
test('server edit invalidation discards an older offline snooze; next action uses fresh row generation', async () => {
  const calls = [];
  const queue = createRegulatoryPreferences(memory(), async (scope, operation) => {
    calls.push(operation);
    return { preferences: {}, generations: { 'regulatory:4': 1 } };
  });
  await queue.set('owner', row, 'dismiss', null, now);
  await queue.sync('owner');
  assert.deepEqual((await queue.read('owner')).preferences, {});
  await queue.set('owner', { ...row, preference_generation: 1 }, 'snooze', 1, now);
  await queue.sync('owner');
  assert.equal(calls[1].generation, 1);
});
