import test from 'node:test';
import assert from 'node:assert/strict';
import { formatDate, formatDateTime } from '../app/formatting/dates.mjs';
import { profileDate } from '../app/profile/profileDate.mjs';
import { compareVersions, recordTitle } from '../app/sync/comparison.mjs';

test('ISO and legacy US API dates share one display without changing their values', () => {
  for (const value of ['2026-11-30', '11/30/2026']) {
    assert.equal(formatDate(value), 'Nov 30, 2026');
    assert.equal(profileDate(value), 'Nov 30, 2026');
    assert.equal(value.includes('2026'), true);
  }
  assert.equal(formatDate('2026-02-03'), 'Feb 3, 2026');
  assert.equal(formatDate('2/3/2026'), 'Feb 3, 2026');
});
test('calendar dates never shift when the device timezone changes', () => {
  const original = process.env.TZ;
  try {
    for (const zone of ['Pacific/Honolulu', 'Pacific/Kiritimati', 'America/Los_Angeles']) {
      process.env.TZ = zone;
      assert.equal(formatDate('2026-11-30'), 'Nov 30, 2026');
      assert.equal(formatDate('2026-11-30T00:00:00Z'), 'Nov 30, 2026');
    }
  } finally { if (original === undefined) delete process.env.TZ; else process.env.TZ = original; }
});
test('missing, invalid and leap-day values are handled without rollover', () => {
  assert.equal(formatDate(null), 'Not recorded');
  assert.equal(formatDate('', ''), '');
  assert.equal(formatDate('2024-02-29'), 'Feb 29, 2024');
  assert.equal(formatDate('2026-02-29'), '2026-02-29');
  assert.equal(formatDateTime('invalid'), 'Not recorded');
  assert.match(formatDateTime(new Date(2026, 10, 30, 12)), /^Nov 30, 2026, /);
});
test('sync review presents dates consistently without mutating either record', () => {
  const local = { date: '11/30/2026', route: 'IAH-DEN' };
  const server = { date: '2026-11-30', route: 'IAH-DEN' };
  const row = compareVersions('flight', local, server).find(item => item.key === 'date');
  assert.equal(row.localValue, 'Nov 30, 2026');
  assert.equal(row.changed, false);
  assert.equal(recordTitle('flight', local), 'Nov 30, 2026 IAH-DEN');
  assert.equal(local.date, '11/30/2026');
  assert.equal(server.date, '2026-11-30');
});
