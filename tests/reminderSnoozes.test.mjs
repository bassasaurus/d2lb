import test from 'node:test';
import assert from 'node:assert/strict';
import { activeSnooze, parseSnoozes, withoutSnooze } from '../app/settings/reminderSnoozes.mjs';
import { logbookAlerts, snoozeKey } from '../app/settings/reminderPresentation.mjs';

for (const row of [
  { medical: true, title: 'Medical Certificate', severity: 'danger', message: 'Review overdue' },
  { id: 'instrument-currency', kind: 'ipc', severity: 'danger', message: 'Review IFR' },
  { id: 12, kind: 'expiration', severity: 'danger', key: 'date:2026-11-01:expired' },
  { id: 13, kind: 'flight_time', severity: 'success', key: 'hours:100.0' },
]) {
  test(`Show Now restores ${row.title || row.kind} and preserves other snoozes`, () => {
    const saved = { [snoozeKey(row)]: 5000, unrelated: 6000 };
    const loaded = parseSnoozes(JSON.stringify(saved));
    assert.equal(activeSnooze(row, loaded, 1000), 5000);
    assert.deepEqual(logbookAlerts([row], loaded, 1000), []);
    const restored = withoutSnooze(row, loaded);
    assert.equal(activeSnooze(row, restored, 1000), null);
    assert.deepEqual(logbookAlerts([row], restored, 1000), [row]);
    assert.equal(restored.unrelated, 6000);
    assert.equal(loaded[snoozeKey(row)], 5000);
    assert.equal(activeSnooze(row, loaded, 5000), null);
  });
}

test('invalid saved snoozes do not break reminder management', () => {
  for (const value of [null, 'null', '[]', 'broken', '12']) assert.deepEqual(parseSnoozes(value), {});
  assert.equal(activeSnooze({ id: 1 }, { '1:undefined': 'invalid' }, 1000), null);
});

test('changed target or alert stage is not marked snoozed', () => {
  const old = { id: 1, key: 'hours:100' };
  const saved = { [snoozeKey(old)]: 5000 };
  assert.equal(activeSnooze({ ...old, key: 'hours:200' }, saved, 1000), null);
});
