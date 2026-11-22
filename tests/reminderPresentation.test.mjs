import assert from 'node:assert/strict';
import test from 'node:test';
import { orderedReminders, reminderTone } from '../app/settings/reminderPresentation.mjs';

test('urgent then approaching then current/reached then unreached milestones, without mutating records', () => {
  const rows = [{ id: 1, severity: 'neutral' }, { id: 2, severity: 'success' },
    { id: 3, severity: 'warning' }, { id: 4, severity: 'danger' }, { id: 5, severity: 'warning' }];
  assert.deepEqual(orderedReminders(rows).map(r => r.id), [4, 3, 5, 2, 1]);
  assert.deepEqual(rows.map(r => r.id), [1, 2, 3, 4, 5]);
});

test('orange medical banners have black text in both themes', () => {
  for (const dark of [false, true]) {
    const tone = reminderTone('warning', dark, { text: '#fff', surface: '#000' });
    assert.equal(tone.text, '#111111');
    assert.equal(tone.background, '#fff0df');
  }
});

test('current medical stays green text without a colored banner; incomplete milestones use normal theme text', () => {
  const colors = { text: '#14181f', surface: '#fff' };
  assert.equal(reminderTone('success', false, colors, true).background, colors.surface);
  assert.equal(reminderTone('success', false, colors, true).text, '#14532d');
  assert.equal(reminderTone('neutral', false, colors).text, colors.text);
  assert.equal(reminderTone(undefined, false, colors).background, colors.surface);
});

test('dates approach first within their color, with overdue dates ahead of future dates', () => {
  const rows = [{ id: 1, severity: 'danger', days_remaining: 5 }, { id: 2, severity: 'danger', days_remaining: -7 },
    { id: 3, severity: 'warning', days_remaining: 25 }, { id: 4, severity: 'warning', days_remaining: 16 },
    { id: 5, severity: 'neutral', completion_percent: '99.9', hours_remaining: '1' }];
  assert.deepEqual(orderedReminders(rows).map(row => row.id), [2, 1, 4, 3, 5]);
});

test('unfinished milestones closest by server-calculated percent sort first, then hours remaining', () => {
  const rows = [{ id: 1, severity: 'neutral', completion_percent: '50.0', hours_remaining: '1.0' },
    { id: 2, severity: 'neutral', completion_percent: '90.0', hours_remaining: '10.0' },
    { id: 3, severity: 'neutral', completion_percent: '90.0', hours_remaining: '2.0' }];
  assert.deepEqual(orderedReminders(rows).map(row => row.id), [3, 2, 1]);
});

test('regulatory reminders stay separate from all flight-hour milestone types', async () => {
  const { reminderGroups } = await import('../app/settings/reminderPresentation.mjs');
  const regulatory = [
    { id: 'medical', medical: true },
    { id: 1, kind: 'flight_review' },
    { id: 2, kind: 'expiration', title: 'IPC' },
    { id: 3, kind: 'expiration', title: 'BFR' },
  ];
  const milestones = ['flight_time', 'time_in_type', 'crew_in_type', 'company_time'].map(kind => ({ kind }));
  const rows = [...regulatory, ...milestones];
  const groups = reminderGroups(rows);
  assert.deepEqual(groups[0].rows, regulatory);
  assert.deepEqual(groups[1].rows, milestones);
  assert.equal(groups.flatMap(group => group.rows).length, rows.length);
  assert.deepEqual(rows, [...regulatory, ...milestones]);
});

test('missing medical expiry stays above dated red reminders', async () => {
  const missing = { medical: true, missing: true, severity: 'danger' };
  const overdue = { severity: 'danger', days_remaining: -200 };
  assert.deepEqual(orderedReminders([overdue, missing]), [missing, overdue]);
});

test('instructor renewal and IPC stay in Reminders, separate from condition milestones', async () => {
  const { reminderGroups } = await import('../app/settings/reminderPresentation.mjs');
  const rows = [{kind: 'instructor_renewal'}, {kind: 'ipc'}, {kind: 'flight_condition'}];
  assert.deepEqual(reminderGroups(rows).map(group => group.rows), [rows.slice(0, 2), rows.slice(2)]);
});

test('Logbook shows caution and red reminders and completed milestones; snoozes expire', async () => {
  const { logbookAlerts, snoozeKey } = await import('../app/settings/reminderPresentation.mjs');
  const red = { id: 1, kind: 'expiration', severity: 'danger', key: 'urgent' };
  const done = { id: 2, kind: 'flight_time', severity: 'success', key: 'hours:100' };
  const caution = { kind: 'expiration', severity: 'warning' };
  const rows = [red, done, caution,
    { kind: 'ipc', severity: 'success' }, { kind: 'flight_time', severity: 'neutral' }];
  assert.deepEqual(logbookAlerts(rows), [red, caution, done]);
  assert.deepEqual(logbookAlerts(rows, { [snoozeKey(red)]: 2000 }, 1000), [caution, done]);
  assert.deepEqual(logbookAlerts(rows, { [snoozeKey(red)]: 2000 }, 2000), [red, caution, done]);
  assert.deepEqual(logbookAlerts([{ ...red, key: 'changed' }], { [snoozeKey(red)]: 2000 }, 1000), [{ ...red, key: 'changed' }]);
});


test('dismissed cautions return when red, then support an expiring snooze', async () => {
  const { logbookAlerts, snoozeKey, cautionDismissalKey, cautionDismissed } = await import('../app/settings/reminderPresentation.mjs');
  for (const identity of [{ id: 1, kind: 'expiration', key: 'same' }, { medical: true, key: '2026-12-31' },
    { id: 'instrument-currency', kind: 'ipc', message: 'Review currency' }]) {
    const caution = { ...identity, severity: 'warning' };
    const saved = { [cautionDismissalKey(caution)]: true };
    assert.equal(cautionDismissed(caution, saved), true);
    assert.deepEqual(logbookAlerts([caution], saved, 1000), []);
    const red = { ...caution, severity: 'danger' };
    assert.equal(cautionDismissed(red, saved), false);
    assert.deepEqual(logbookAlerts([red], saved, 1000), [red]);
    saved[snoozeKey(red)] = 2000;
    assert.deepEqual(logbookAlerts([red], saved, 1000), []);
    assert.deepEqual(logbookAlerts([red], saved, 2000), [red]);
  }
});
