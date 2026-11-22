import test from 'node:test';
import assert from 'node:assert/strict';
import { createReminderCache } from '../app/settings/reminderCache.mjs';
import { clearResourcePreferences } from '../app/settings/reminderSnoozes.mjs';
import { cautionDismissalKey, logbookAlerts, reminderDeadline, snoozeKey } from '../app/settings/reminderPresentation.mjs';

function storage() {
  const data = new Map();
  return { getItem: async key => data.get(key) ?? null, setItem: async (key, value) => data.set(key, value) };
}

test('saved alerts and management survive a new cache instance without mixing accounts or environments', async () => {
  const disk = storage();
  const cache = createReminderCache(disk);
  const original = { reminders: [{ id: 12, severity: 'danger', due_date: '2026-11-01' }], medical_alert: { severity: 'danger' } };
  await cache.write('local:user:1', 'alerts', original, 1234);
  await cache.write('local:user:1', 'manage', { reminders: [{ id: 15 }] }, 5678);
  const restarted = createReminderCache(disk);
  assert.deepEqual(await restarted.read('local:user:1', 'alerts'), { data: original, updatedAt: 1234 });
  assert.equal(await restarted.read('production:user:1', 'alerts'), null);
  assert.equal(await restarted.read('local:user:2', 'alerts'), null);
  assert.deepEqual((await restarted.read('local:user:1', 'manage')).data.reminders, [{ id: 15 }]);
});

test('failed refresh leaves the last verified snapshot and its timestamp intact', async () => {
  const cache = createReminderCache(storage());
  await cache.write('account', 'alerts', { reminders: [{ id: 1 }] }, 1000);
  await assert.rejects(cache.write('account', 'alerts', { error: 'unavailable' }, 2000));
  assert.equal((await cache.read('account', 'alerts')).updatedAt, 1000);
  assert.deepEqual((await cache.read('account', 'alerts')).data.reminders, [{ id: 1 }]);
  await cache.write('account', 'alerts', { reminders: [] }, 3000);
  assert.deepEqual((await cache.read('account', 'alerts')).data.reminders, []);
});

test('editing clears all stages of only the edited reminder and keeps offline snapshots marked stale', async () => {
  const saved = { '12:old': 5000, '12:new': 6000, 'dismissed-caution:12:old': true,
    '123:other': 7000, 'medical:old': 8000, 'dismissed-caution:medical:old': true };
  const reset = clearResourcePreferences(saved, 12);
  assert.deepEqual(reset, { '123:other': 7000, 'medical:old': 8000, 'dismissed-caution:medical:old': true });
  assert.deepEqual(clearResourcePreferences(reset, 'medical'), { '123:other': 7000 });
  assert.equal(saved['12:old'], 5000);
  const cache = createReminderCache(storage());
  await cache.write('one', 'alerts', { reminders: [{ id: 12 }] }, 1000);
  await cache.write('two', 'alerts', { reminders: [{ id: 55 }] }, 1000);
  await cache.invalidate('one');
  assert.equal((await cache.read('one', 'alerts')).invalidated, true);
  assert.equal((await cache.read('two', 'alerts')).invalidated, undefined);
});

test('caution dismissal, red escalation, persisted snooze expiration, then editing restore', () => {
  const caution = { id: 12, kind: 'expiration', severity: 'warning', key: '2026-12-01:warning' };
  const saved = { [cautionDismissalKey(caution)]: true };
  assert.deepEqual(logbookAlerts([caution], saved, 1000), []);
  const red = { ...caution, severity: 'danger', key: '2026-12-01:danger' };
  assert.deepEqual(logbookAlerts([red], saved, 1000), [red]);
  saved[snoozeKey(red)] = 3000;
  const restarted = JSON.parse(JSON.stringify(saved));
  assert.deepEqual(logbookAlerts([red], restarted, 2999), []);
  assert.deepEqual(logbookAlerts([red], restarted, 3000), [red]);
  assert.deepEqual(logbookAlerts([red], clearResourcePreferences(restarted, 12), 1000), [red]);
});

test('exact dates are provided without repeating dates already shown or calculating regulatory deadlines', () => {
  assert.equal(reminderDeadline({ kind: 'expiration', due_date: '2026-12-01', message: 'Review by Dec 01, 2026.' }), null);
  assert.equal(reminderDeadline({ kind: 'ipc', due_date: '2026-12-01', message: 'Holding required' }), 'Review date: Dec 1, 2026');
  assert.equal(reminderDeadline({ medical: true, due_date: '2026-12-01' }), 'Expires: Dec 1, 2026');
  assert.equal(reminderDeadline({ kind: 'flight_time', due_date: '2026-12-01' }), null);
  assert.equal(reminderDeadline({ due_date: 'invalid' }), null);
});

test('rapid snooze actions persist together and survive a new preference store', async () => {
  const { createReminderPreferences } = await import('../app/settings/reminderPreferences.mjs');
  const disk = storage();
  const prefs = createReminderPreferences(disk);
  await Promise.all([
    prefs.update('one', saved => ({ ...saved, first: 4000 })),
    prefs.update('one', saved => ({ ...saved, second: 5000 })),
    prefs.update('two', saved => ({ ...saved, otherAccount: 6000 })),
  ]);
  const reopened = createReminderPreferences(disk);
  assert.deepEqual(await reopened.update('one', saved => saved), { first: 4000, second: 5000 });
  assert.deepEqual(await reopened.update('two', saved => saved), { otherAccount: 6000 });
});

test('a failed preference write preserves saved data and does not block retry', async () => {
  const { createReminderPreferences } = await import('../app/settings/reminderPreferences.mjs');
  const disk = storage();
  let fail = false;
  const prefs = createReminderPreferences({ ...disk, setItem: async (...args) => {
    if (fail) throw new Error('disk unavailable');
    return disk.setItem(...args);
  }});
  await prefs.update('one', () => ({ prior: 4000 }));
  fail = true;
  await assert.rejects(prefs.update('one', () => ({ lost: 5000 })));
  fail = false;
  assert.deepEqual(await prefs.update('one', saved => ({ ...saved, retry: 6000 })), { prior: 4000, retry: 6000 });
});
