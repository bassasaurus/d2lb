import test from 'node:test';
import assert from 'node:assert/strict';
import { createReminderEvents } from '../app/settings/reminderEvents.mjs';
import { createReminderPreferences } from '../app/settings/reminderPreferences.mjs';
import { createReminderCache } from '../app/settings/reminderCache.mjs';
import { withoutSnooze, clearResourcePreferences } from '../app/settings/reminderSnoozes.mjs';
import { snoozeKey, logbookAlerts } from '../app/settings/reminderPresentation.mjs';

function storage() {
  const rows = new Map();
  return { getItem: async key => rows.get(key) ?? null, setItem: async (key, value) => rows.set(key, value) };
}

test('Show Now updates an already-mounted Logbook consumer without remount or refresh', async () => {
  const events = createReminderEvents();
  const prefs = createReminderPreferences(storage(), events.publish);
  const reminder = { id: 12, kind: 'expiration', severity: 'danger', key: 'deadline' };
  let mountedPreferences = {};
  const unsubscribe = events.subscribe(event => {
    if (event.type === 'preferences' && event.scope === 'account-1') mountedPreferences = event.saved;
  });
  await prefs.update('account-1', () => ({ [snoozeKey(reminder)]: 5000 }));
  assert.deepEqual(logbookAlerts([reminder], mountedPreferences, 1000), []);
  await prefs.update('account-1', saved => withoutSnooze(reminder, saved));
  assert.deepEqual(logbookAlerts([reminder], mountedPreferences, 1000), [reminder]);
  await prefs.update('account-2', () => ({ [snoozeKey(reminder)]: 5000 }));
  assert.deepEqual(logbookAlerts([reminder], mountedPreferences, 1000), [reminder]);
  unsubscribe();
});

test('Restore publishes updated alerts and cleared preferences to an existing Logbook', async () => {
  const events = createReminderEvents();
  const disk = storage();
  const cache = createReminderCache(disk, events.publish);
  const prefs = createReminderPreferences(disk, events.publish);
  const milestone = { id: 22, kind: 'flight_time', severity: 'success', key: 'hours:100', progress_label: 'Total 100 / 100 | 0' };
  let data = { reminders: [] };
  let saved = {};
  const stop = events.subscribe(event => {
    if (event.scope !== 'one') return;
    if (event.type === 'data' && event.kind === 'alerts') data = event.snapshot.data;
    if (event.type === 'preferences') saved = event.saved;
  });
  await prefs.update('one', () => ({ [snoozeKey(milestone)]: 5000 }));
  await cache.write('one', 'alerts', { reminders: [] });
  await prefs.update('one', previous => clearResourcePreferences(previous, milestone.id));
  await cache.write('one', 'alerts', { reminders: [milestone] });
  assert.deepEqual(logbookAlerts(data.reminders, saved, 1000), [milestone]);
  stop();
});

test('only committed changes notify listeners and unsubscribed screens receive no events', async () => {
  const events = createReminderEvents();
  const disk = storage();
  let calls = 0;
  const stop = events.subscribe(() => { calls += 1; });
  const prefs = createReminderPreferences({ ...disk, setItem: async () => { throw new Error('write failed'); } }, events.publish);
  await assert.rejects(prefs.update('one', () => ({ example: true })));
  assert.equal(calls, 0);
  events.publish({ type: 'preferences' });
  assert.equal(calls, 1);
  stop();
  events.publish({ type: 'preferences' });
  assert.equal(calls, 1);
});
