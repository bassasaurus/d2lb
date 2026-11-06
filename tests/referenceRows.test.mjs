import test from 'node:test';
import assert from 'node:assert/strict';
import { completeReferenceRows } from '../app/api/referenceRows.mjs';
test('accepts the complete older Django response even when it has a spurious next link', () => {
  const results = Array.from({ length: 437 }, (_, index) => ({ id: index + 1 }));
  assert.equal(completeReferenceRows({ count: 437, results, next: '/api/tailnumbers/?offset=100' }), results);
});
test('accepts corrected responses and empty accounts', () => {
  assert.deepEqual(completeReferenceRows({ count: 0, next: null, results: [] }), []);
  assert.deepEqual(completeReferenceRows({ count: 1, next: null, results: [{ id: 7 }] }), [{ id: 7 }]);
});
test('rejects genuinely incomplete or malformed responses before cache replacement', () => {
  for (const response of [{ count: 2, results: [{ id: 1 }], next: '/more' },
    { count: 2, results: [{ id: 1 }], next: null }, { results: [{ id: 1 }], next: '/more' },
    { count: 2, results: [{ id: 1 }, { id: 1 }] }, { count: 1, results: [{ id: '1' }] }, {}]) {
    assert.throws(() => completeReferenceRows(response));
  }
});
