import test from 'node:test';
import assert from 'node:assert/strict';
import { createAirportChecker, applyAirportChoices, normalizeRoute, routeCodes, routeErrors } from '../app/airports/routeCheck.mjs';
function fixture() {
  const data = new Map();
  const storage = { async getItem(key) { return data.get(key) || null; }, async setItem(key, value) { data.set(key, value); } };
  let online = true, now = 0;
  const check = createAirportChecker({ storage, now: () => now, get: async route => {
    if (!online) throw new Error('Offline');
    return { entries: routeCodes(route).map((code, position) => ({ code, position, status: code === 'ZZZZ' ? 'unknown' : 'recognized', candidates: [] })) };
  } });
  return { check, offline() { online = false; }, expire() { now = 86400001; } };
}
test('routes normalize spaces/case and preserve FAA digits', () => {
  assert.equal(normalizeRoute('bog 2tx1'), 'BOG-2TX1');
  assert.deepEqual(routeCodes('BOG-2TX1/IAH'), ['BOG', '2TX1', 'IAH']);
});
test('offline cache can validate new combinations, and unknown offline codes stay pending', async () => {
  const f = fixture();
  await f.check('IAH-LAX', 'account-a');
  f.offline();
  const result = await f.check('LAX-IAH-BOG', 'account-a');
  assert.equal(result.offline, true);
  assert.deepEqual(result.entries.map(e => e.status), ['recognized', 'recognized', 'pending']);
  assert.deepEqual(result.entries.map(e => e.position), [0, 1, 2]);
  assert.deepEqual(routeErrors(result.entries), []);
});
test('cache expires and never crosses accounts', async () => {
  const f = fixture();
  await f.check('IAH', 'account-a'); f.offline();
  assert.equal((await f.check('IAH', 'account-b')).entries[0].status, 'pending');
  f.expire();
  assert.equal((await f.check('IAH', 'account-a')).entries[0].status, 'pending');
});
test('unknown and ambiguous errors disappear only for a valid choice tied to this route', () => {
  const entries = [{ code: 'XYZ', position: 0, status: 'ambiguous', candidates: [{ id: 7, label: 'Airport' }] }, { code: 'ZZZZ', position: 1, status: 'unknown' }];
  assert.equal(routeErrors(entries).length, 2);
  const selected = applyAirportChoices('XYZ-ZZZZ', entries, { route: 'XYZ-ZZZZ', airports: { '0': 7 } });
  assert.equal(selected[0].status, 'recognized');
  assert.equal(routeErrors(selected).length, 1);
  assert.equal(applyAirportChoices('XYZ', entries, { route: 'OLD', airports: { '0': 7 } })[0].status, 'ambiguous');
});
test('old-server or malformed responses remain pending rather than inventing validation', async () => {
  const check = createAirportChecker({ get: async () => ({}), storage: { getItem: async () => null } });
  assert.equal((await check('IAH', 'a')).entries[0].status, 'pending');
});
