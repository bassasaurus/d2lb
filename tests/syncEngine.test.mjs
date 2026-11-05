import test from 'node:test';
import assert from 'node:assert/strict';
import { DatabaseSync } from 'node:sqlite';
import { adapter } from './helpers/sqlite.mjs';
import { createFlightStore } from '../app/storage/flightStore.mjs';
import { drainFlightQueue } from '../app/api/syncEngine.mjs';

test('server saves but response is lost: retry uses same operation and yields one record', async () => {
  const db = new DatabaseSync(':memory:');
  const store = await createFlightStore(adapter(db));
  await store.save('a', 'local-one', { route: 'IAH-LAS' });
  const receipts = new Map();
  let count = 0;
  let loseResponse = true;
  let now = 0;
  const config = {
    store, scope: 'a', uuid: () => `uuid-${++count}`, isCurrent: async () => true, now: () => now,
    send: async operation => {
      if (!receipts.has(operation.operation_id)) {
        receipts.set(operation.operation_id, { operation_id: operation.operation_id, flight: { ...operation.data, id: 1, revision: 'revision' } });
      }
      if (loseResponse) { loseResponse = false; throw new Error('connection dropped'); }
      return receipts.get(operation.operation_id);
    },
  };
  await assert.rejects(drainFlightQueue(config));
  assert.equal(await store.pendingCount('a'), 1);
  now = 6000;
  assert.equal(await drainFlightQueue(config), 1);
  assert.equal(receipts.size, 1);
  assert.equal(await store.pendingCount('a'), 0);
  db.close();
});

test('conflict is blocked and retained, while another pending flight can synchronize', async () => {
  const db = new DatabaseSync(':memory:');
  const store = await createFlightStore(adapter(db));
  await store.save('a', 'one', { id: 2, revision: 'old', route: 'IAH-LAS' });
  await store.save('a', 'two', { route: 'IAH-MCO' });
  let count = 0;
  await drainFlightQueue({ store, scope: 'a', uuid: () => `uuid-${++count}`, isCurrent: async () => true,
    send: async operation => {
      if (operation.action === 'update') throw { response: { status: 409 } };
      return { operation_id: operation.operation_id, flight: { ...operation.data, id: 3, revision: 'new' } };
    },
  });
  assert.equal(await store.pendingCount('a'), 1);
  assert.match((await store.list('a')).find(row => row.id === 2).sync_error, /website/);
  db.close();
});

test('an upload pass stops at 100 operations and preserves the remainder', async () => {
  let attempts = 0;
  let acknowledged = 0;
  await drainFlightQueue({
    store: {
      nextOperation: async () => ({ operation_id: `${++attempts}`, request: '{}' }),
      acknowledge: async () => { acknowledged++; },
    },
    scope: 'a', uuid: () => 'new-id', isCurrent: async () => true,
    send: async () => ({}),
  });
  assert.equal(attempts, 100);
  assert.equal(acknowledged, 100);
});
