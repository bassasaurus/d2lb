import test from 'node:test';
import assert from 'node:assert/strict';
import { metricValue, validateSummary } from '../app/stats/summary.mjs';

test('summary formatting preserves decimal hours, integer landings and missing values', () => {
  assert.equal(metricValue('pilot_in_command', '1234.5'), '1234.5');
  assert.equal(metricValue('second_in_command', '0.0'), '0.0');
  assert.equal(metricValue('landings_day', 15), '15');
  assert.equal(metricValue('last_flown', '2026-11-06'), '2026-11-06');
  assert.equal(metricValue('last_30', null), '—');
});
test('validates complete snapshots and rejects malformed data before replacing cache', () => {
  const data = { schema_version: 1, downloaded_at: '2026-11-06T12:00:00Z', totals: [{ total: 'All', total_time: '123.4' }], aircraft: [] };
  assert.equal(validateSummary(data), data);
  for (const invalid of [{ ...data, schema_version: 2 }, { ...data, downloaded_at: 'bad' },
    { ...data, aircraft: {} }, { ...data, totals: [{ total: 'All', total_time: 'bad' }] },
    { ...data, totals: [{ total_time: '5' }] }]) assert.throws(() => validateSummary(invalid));
});


test('training program totals validate without requiring them on older cached snapshots', () => {
  const data = { schema_version: 1, downloaded_at: '2026-11-27T12:00:00Z', totals: [], aircraft: [] };
  assert.equal(validateSummary(data), data);
  const row = { program: '141', label: 'Part 141', total: '4.0', ffs: '2.3', ftd: '1.7', atd: '0.0', unclassified: '0.0' };
  assert.equal(validateSummary({ ...data, simulator_program_totals: [row] }).simulator_program_totals[0], row);
  for (const bad of [{ ...row, total: 'bad' }, { ...row, ffs: -1 }, { ...row, program: '999' }])
    assert.throws(() => validateSummary({ ...data, simulator_program_totals: [bad] }));
});
