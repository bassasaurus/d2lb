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

test('keeps separate server-provided instrument categories without pooling counts', () => {
  const data = { ...snapshot, instrument_categories: [
    { category: 'A', category_label: 'Airplane', approaches: { ...status, count: 3, required: 6 }, holding: { ...status, count: 1, required: 1, current: true } },
    { category: 'R', category_label: 'Helicopter', approaches: { ...status, count: 3, required: 6 }, holding: { ...status, required: 1 } },
  ] };
  assert.equal(validateRecency(data), data);
  assert.deepEqual(data.instrument_categories.map(row => row.approaches.count), [3, 3]);
  assert.throws(() => validateRecency({ ...data, instrument_categories: [{ category: 'R', category_label: 'Helicopter' }] }));
});
test('accepts server landing dates and expiry while preserving older snapshots', () => {
  const day = { ...status, count: 3, current: true,
    last_dates: ['2026-11-01', '2026-11-01', '2026-10-20'], valid_through: '2027-01-18' };
  const data = { ...snapshot, categories: [{ label: 'ASEL', day, night: status }] };
  assert.equal(validateRecency(data), data);
  for (const invalid of [{ ...day, last_dates: ['bad'] }, { ...day, last_dates: Array(4).fill('2026-11-01') },
    { ...day, valid_through: 'bad' }]) {
    assert.throws(() => validateRecency({ ...data, categories: [{ label: 'ASEL', day: invalid, night: status }] }));
  }
});
