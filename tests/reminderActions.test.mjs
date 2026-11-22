import test from 'node:test';
import assert from 'node:assert/strict';
import { reminderDestination, reminderConfirmation } from '../app/settings/reminderActions.mjs';
import { cautionDismissalKey, logbookAlerts, snoozeKey } from '../app/settings/reminderPresentation.mjs';
import { withoutSnooze, clearResourcePreferences } from '../app/settings/reminderSnoozes.mjs';

test('medical and derived IFR alerts open their details in Manage rather than an incomplete edit form', () => {
  assert.deepEqual(reminderDestination({ medical: true }), { name: 'ManageReminders' });
  assert.deepEqual(reminderDestination({ id: 'instrument-currency' }), { name: 'ManageReminders' });
});

test('saved reminders open their complete record; unknown IDs require a refresh', () => {
  const fullRecord = { id: 12, kind: 'company_time', target_hours: '500', company: 'Example', company_start_date: '2026-01-01' };
  assert.deepEqual(reminderDestination({ id: 12 }, [fullRecord]), { name: 'EditReminder', params: { reminder: fullRecord } });
  assert.equal(reminderDestination({ id: 13 }, [fullRecord]), null);
});

test('confirmations explain snooze duration and the caution dismissal limit', () => {
  assert.equal(reminderConfirmation('snooze', 1), 'Snoozed for 1 day.');
  assert.equal(reminderConfirmation('snooze', 7), 'Snoozed for 7 days.');
  assert.equal(reminderConfirmation('caution'), 'Hidden until this reminder turns red.');
  assert.equal(reminderConfirmation('milestone'), 'Milestone dismissed.');
});

test('Undo returns the affected alert without restoring unrelated hidden alerts', () => {
  const red = { id: 12, kind: 'expiration', severity: 'danger', key: 'date:expired' };
  const other = { id: 13, kind: 'expiration', severity: 'danger', key: 'date:expired' };
  const saved = { [snoozeKey(red)]: 5000, [snoozeKey(other)]: 5000 };
  assert.deepEqual(logbookAlerts([red, other], saved, 1000), []);
  assert.deepEqual(logbookAlerts([red, other], withoutSnooze(red, saved), 1000), [red]);
  const caution = { ...red, severity: 'warning', key: 'date:warning' };
  const dismissed = { ...saved, [cautionDismissalKey(caution)]: true };
  assert.deepEqual(logbookAlerts([caution], dismissed, 1000), []);
  assert.deepEqual(logbookAlerts([caution], clearResourcePreferences(dismissed, 12), 1000), [caution]);
});

test('category IFR alerts open Manage Reminders', () => {
  for (const category of ['A', 'R']) assert.deepEqual(reminderDestination({ id: `instrument-currency-${category}` }), { name: 'ManageReminders' });
});
