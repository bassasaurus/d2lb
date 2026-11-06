import test from 'node:test';
import assert from 'node:assert/strict';
import { validateRecency } from '../app/stats/recency.mjs';
const status = { count: 0, required: 3, current: false };
const snapshot = { schema_version: 1, downloaded_at: '2026-11-06T12:00:00Z', as_of: '2026-11-06',
  categories: [], types: [], instrument: { approaches: status, holding: status } };
test('accepts server-provided recency flags without recalculating them', () => {
  const data = { ...snapshot, categories: [{ label: 'AMEL', day: { ...status, count: 5, current: false }, night: status }] };
  assert.equal(validateRecency(data), data);
  assert.equal(validateRecency(data).categories[0].day.current, false);
});
test('rejects malformed snapshots and missing flags before cache replacement', () => {
  for (const invalid of [{ ...snapshot, schema_version: 2 }, { ...snapshot, downloaded_at: 'bad' },
    { ...snapshot, instrument: {} }, { ...snapshot, types: [{ label: 'A320', day: status }] }]) {
    assert.throws(() => validateRecency(invalid));
  }
});
