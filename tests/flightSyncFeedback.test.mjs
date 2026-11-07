import test from 'node:test';
import assert from 'node:assert/strict';
import { completedFlightSyncs } from '../app/api/flightSyncFeedback.mjs';

test('confirmed uploads trigger feedback independently of whether a pending card mounted', () => {
  assert.deepEqual(completedFlightSyncs([{ local_id: 'uuid', sync_state: 'pending_create' }],
    [{ local_id: 'uuid', id: 7, sync_state: 'synced' }]), ['uuid']);
  assert.deepEqual(completedFlightSyncs([{ local_id: 'old', id: 7, sync_state: 'pending_update' }],
    [{ local_id: 'server:7', id: 7, sync_state: 'synced' }]), ['server:7']);
});
test('cached downloads, unrelated records and failed uploads do not indicate a successful sync', () => {
  const before = [{ local_id: 'cached', id: 1, sync_state: 'synced' },
    { local_id: 'failed', id: 2, sync_state: 'pending_update' }];
  assert.deepEqual(completedFlightSyncs(before, [...before, { local_id: 'new', id: 3, sync_state: 'synced' }]), []);
});

test('offline reconnect acknowledgement survives a list mounting after upload', async () => {
  const { createFlightSyncFeedback } = await import('../app/api/flightSyncFeedback.mjs');
  const feedback = createFlightSyncFeedback(() => 1000);
  feedback.record('account-a', { local_id: 'offline-create' }, { id: 42 });
  assert.deepEqual(feedback.take('account-b', [{ id: 42, local_id: 'server:42', sync_state: 'synced' }]), []);
  assert.deepEqual(feedback.take('account-a', [{ id: 42, local_id: 'server:42', sync_state: 'pending_update' }]), []);
  const rows = [{ id: 42, local_id: 'server:42', sync_state: 'synced' }];
  assert.deepEqual(feedback.take('account-a', rows), ['server:42']);
  assert.deepEqual(feedback.take('account-a', rows), []);
});

test('deletions and expired reconnect events do not play success animations', async () => {
  const { createFlightSyncFeedback } = await import('../app/api/flightSyncFeedback.mjs');
  let now = 0;
  const feedback = createFlightSyncFeedback(() => now);
  feedback.record('a', { local_id: 'deleted' }, undefined);
  feedback.record('a', { local_id: 'old' }, { id: 1 });
  now = 600001;
  assert.deepEqual(feedback.take('a', [{ local_id: 'old', id: 1, sync_state: 'synced' }]), []);
});

test('sync worker records feedback only after server acknowledgement is stored', async () => {
  const { DatabaseSync } = await import('node:sqlite');
  const { adapter } = await import('./helpers/sqlite.mjs');
  const { createFlightStore } = await import('../app/storage/flightStore.mjs');
  const { drainFlightQueue } = await import('../app/api/syncEngine.mjs');
  const { createFlightSyncFeedback } = await import('../app/api/flightSyncFeedback.mjs');
  const db = new DatabaseSync(':memory:');
  const store = await createFlightStore(adapter(db));
  const feedback = createFlightSyncFeedback();
  await store.save('a', 'offline', { date: '11/06/2026', route: 'IAH-LAS' });
  await drainFlightQueue({ store, scope: 'a', uuid: () => 'upload', isCurrent: async () => true,
    send: async request => ({ operation_id: request.operation_id, flight: { id: 1, revision: 'one' } }),
    onAcknowledged: ({ scope, operation, flight }) => feedback.record(scope, operation, flight) });
  const rows = await store.list('a');
  assert.equal(rows[0].sync_state, 'synced');
  assert.deepEqual(feedback.take('a', rows), ['offline']);
  await store.save('a', 'failed', { route: 'IAH-LAS' });
  await assert.rejects(drainFlightQueue({ store, scope: 'a', uuid: () => 'failed-upload', isCurrent: async () => true,
    send: async () => { throw new Error('offline'); },
    onAcknowledged: () => assert.fail('Unconfirmed upload must not show synced feedback') }));
  assert.deepEqual(feedback.take('a', await store.list('a')), []);
  db.close();
});
