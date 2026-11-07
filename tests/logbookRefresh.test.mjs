import test from 'node:test';
import assert from 'node:assert/strict';
import { shouldRefreshLogbook, logbookPendingCount } from '../app/api/logbookRefresh.mjs';
test('returning to a previously downloaded logbook does not trigger network refresh', () => {
  assert.equal(shouldRefreshLogbook({ hasSnapshot: true, pending: 0 }), false);
});
test('first download, queued changes and explicit refresh still request the server', () => {
  assert.equal(shouldRefreshLogbook({ hasSnapshot: false }), true);
  assert.equal(shouldRefreshLogbook({ hasSnapshot: true, pending: 1 }), true);
  assert.equal(shouldRefreshLogbook({ hasSnapshot: true, force: true }), true);
});
test('pending work includes aircraft/default preferences and tailnumbers, not just flights', async () => {
  const scopes = [];
  const count = await logbookPendingCount({ pendingCount: async scope => { scopes.push(scope); return { flights: 0, aircraft: 1, tails: 2 }[scope]; } }, ['flights', 'aircraft', 'tails']);
  assert.equal(count, 3);
  assert.deepEqual(scopes.sort(), ['aircraft', 'flights', 'tails']);
});
