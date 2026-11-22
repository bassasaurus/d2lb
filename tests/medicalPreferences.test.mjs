import test from 'node:test';
import assert from 'node:assert/strict';
import { createMedicalPreferences, snoozeUntil, medicalVisible, medicalStageEnd } from '../app/settings/medicalPreferences.mjs';
function memory() {
  const data = new Map();
  return { getItem: async key => data.get(key) ?? null, setItem: async (key, value) => data.set(key, value) };
}
test('medical snoozes end at 0000Z regardless of the local timezone', () => {
  const now = Date.UTC(2026, 10, 21, 23, 55);
  assert.equal(snoozeUntil(1, now), '2026-11-22');
  assert.equal(snoozeUntil(30, Date.UTC(2026, 11, 31, 8)), '2027-01-30');
  assert.throws(() => snoozeUntil(2));
});
test('green is hidden; dismissal ends at red; snooze expires exactly at midnight', () => {
  const alert = { severity: 'warning', due_date: '2026-11-30' };
  assert.equal(medicalVisible({ ...alert, severity: 'success' }), false);
  assert.equal(medicalVisible(alert), true);
  assert.equal(medicalVisible(alert, { caution_due: alert.due_date }), false);
  const red = { ...alert, severity: 'danger' };
  assert.equal(medicalVisible(red, { caution_due: alert.due_date }), true);
  assert.equal(medicalVisible(red, { until: '2026-11-25' }, Date.UTC(2026, 10, 24, 23, 59)), false);
  assert.equal(medicalVisible(red, { until: '2026-11-25' }, Date.UTC(2026, 10, 25)), true);
});
test('offline choice survives restart and syncs as an absolute date without extending on replay', async () => {
  const storage = memory();
  const queue = createMedicalPreferences(storage, async () => { throw new Error('offline'); });
  await queue.set('owner', { until: '2026-11-25' });
  await assert.rejects(queue.sync('owner'));
  const calls = [];
  const restarted = createMedicalPreferences(storage, async (scope, preference) => {
    calls.push([scope, preference]);
    return { preference, generation: 0 };
  });
  assert.equal((await restarted.read('owner')).pending, true);
  await restarted.sync('owner');
  assert.equal(calls[0][1].until, '2026-11-25');
  assert.equal((await restarted.read('owner')).pending, false);
  assert.deepEqual((await restarted.read('other')).preference, {});
});
test('new choices made while an upload is in flight are sent after the older response', async () => {
  let release;
  const calls = [];
  const queue = createMedicalPreferences(memory(), async (scope, preference) => {
    calls.push(preference);
    if (calls.length === 1) await new Promise(resolve => { release = resolve; });
    return { preference, generation: 0 };
  });
  await queue.set('owner', { until: '2026-11-25' });
  const sync = queue.sync('owner');
  while (!release) await new Promise(resolve => setTimeout(resolve, 0));
  await queue.set('owner', {});
  release();
  await sync;
  assert.equal(calls.length, 2);
  assert.deepEqual((await queue.read('owner')).preference, { generation: 0 });
  assert.equal((await queue.read('owner')).pending, false);
});
test('an expired offline edit generation accepts the server reset instead of resurrecting a snooze', async () => {
  const queue = createMedicalPreferences(memory(), async () => ({ preference: {}, generation: 1 }));
  await queue.set('owner', { until: '2026-11-25' });
  await queue.sync('owner');
  assert.deepEqual((await queue.read('owner')).preference, {});
  assert.equal((await queue.read('owner')).generation, 1);
});

test('medical stage snoozes end at yellow or red instead of a fixed day count', () => {
  const green = { severity: 'success', due_date: '2027-03-31' };
  assert.equal(medicalStageEnd(green), '2027-02-14');
  const yellow = { ...green, severity: 'warning' };
  assert.equal(medicalStageEnd(yellow), '2027-03-01');
  assert.equal(medicalVisible(yellow, { until: medicalStageEnd(yellow) }, Date.UTC(2027, 1, 28, 23, 59)), false);
  assert.equal(medicalVisible({ ...yellow, severity: 'danger' }, { until: medicalStageEnd(yellow) }, Date.UTC(2027, 2, 1)), true);
  assert.equal(medicalStageEnd({ ...yellow, severity: 'danger' }), null);
});
