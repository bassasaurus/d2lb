import test from 'node:test';
import assert from 'node:assert/strict';
import { statsRecordState, refreshStats } from '../app/stats/statsRefresh.mjs';
function fixture() {
  const data = { rows: [{ id: 1, local_id: 'server:1', revision: 'a', sync_state: 'synced' }], pending: 0, saves: [], synced: 0, fetched: 0 };
  const store = {
    list: async () => data.rows, deletedRecords: async () => [], pendingCount: async () => data.pending,
    cacheReference: async (...args) => data.saves.push(args),
  };
  const args = { store, scope: 'owner', referenceScopes: () => [], isCurrent: async () => true,
    validate: value => value, onPhase: () => {}, sync: async () => { data.synced++; return 'owner'; },
    fetchSnapshot: async () => { data.fetched++; return { totals: [] }; } };
  return { data, store, args };
}
test('unchanged records fetch API totals without unnecessarily draining queues', async () => {
  const { data, store, args } = fixture();
  args.cached = { records_fingerprint: (await statsRecordState(store, 'owner', () => [])).fingerprint };
  const result = await refreshStats(args);
  assert.equal(data.synced, 0);
  assert.equal(data.fetched, 1);
  assert.equal(result.pending, 0);
  assert.equal(data.saves.length, 1);
});
test('changed records sync before fetching totals; unresolved queue stays pending', async () => {
  const { data, args } = fixture();
  args.cached = { records_fingerprint: 'previous' };
  data.pending = 1;
  args.fetchSnapshot = async () => { assert.equal(data.synced, 1); return { totals: [] }; };
  const result = await refreshStats(args);
  assert.equal(result.pending, 1);
});
test('sync failure and account change preserve the last cached totals', async () => {
  const { data, args } = fixture();
  args.sync = async () => { throw new Error('Offline'); };
  await assert.rejects(refreshStats(args), /Offline/);
  assert.equal(data.saves.length, 0);
  args.isCurrent = async () => false;
  assert.equal(await refreshStats(args), null);
  assert.equal(data.saves.length, 0);
});
test('concurrent edits during download cannot mark old totals current', async () => {
  const { data, args } = fixture();
  args.fetchSnapshot = async () => { data.rows = [{ ...data.rows[0], revision: 'changed' }]; return { totals: [] }; };
  await assert.rejects(refreshStats(args), /Records changed/);
  assert.equal(data.saves.length, 0);
});
test('fingerprints ignore record order but detect changed revisions and deletions', async () => {
  const { data, store } = fixture();
  data.rows.push({ id: 2, revision: 'b' });
  const before = await statsRecordState(store, 'owner', () => []);
  data.rows.reverse();
  assert.equal((await statsRecordState(store, 'owner', () => [])).fingerprint, before.fingerprint);
  data.rows.pop();
  assert.notEqual((await statsRecordState(store, 'owner', () => [])).fingerprint, before.fingerprint);
});
