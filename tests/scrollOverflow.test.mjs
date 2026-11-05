import test from 'node:test';
import assert from 'node:assert/strict';
import { scrollOverflow } from '../app/components/scrollOverflow.mjs';
test('short lists and unmeasured views have no overflow indicators', () => {
  assert.deepEqual(scrollOverflow({ content: 400, viewport: 600 }), { before: false, after: false });
  assert.deepEqual(scrollOverflow({ content: 400 }), { before: false, after: false });
});
test('scroll edges follow actual content and viewport metrics', () => {
  assert.deepEqual(scrollOverflow({ content: 1000, viewport: 300, offset: 0 }), { before: false, after: true });
  assert.deepEqual(scrollOverflow({ content: 1000, viewport: 300, offset: 100 }), { before: true, after: true });
  assert.deepEqual(scrollOverflow({ content: 1000, viewport: 300, offset: 700 }), { before: true, after: false });
  assert.deepEqual(scrollOverflow({ content: 1000, viewport: 300, offset: -50 }), { before: false, after: true });
});
test('content resizing, end insets and fractional layout rounding are handled', () => {
  assert.deepEqual(scrollOverflow({ content: 301, viewport: 300 }), { before: false, after: false });
  assert.equal(scrollOverflow({ content: 1000, viewport: 300, offset: 700, insetEnd: 30 }).after, true);
  assert.equal(scrollOverflow({ content: 1000, viewport: 300, offset: 730, insetEnd: 30 }).after, false);
});
