import test from 'node:test';
import assert from 'node:assert/strict';
import { DatabaseSync } from 'node:sqlite';
import { adapter } from './helpers/sqlite.mjs';
import { createFlightStore } from '../app/storage/flightStore.mjs';
import { localChanges } from '../app/storage/localChanges.mjs';
import { createAutoSync } from '../app/api/autoSync.mjs';
import { drainFlightQueue } from '../app/api/syncEngine.mjs';

const online = {isConnected: true, isInternetReachable: true};

test('committed CRUD changes immediately upload without any screen navigation or refresh', async () => {
  for (const scope of ['owner', 'owner:aircraft', 'owner:tailnumbers']) {
    const db = new DatabaseSync(':memory:');
    const store = await createFlightStore(adapter(db));
    const actions = [];
    let operationNumber = 0;
    const worker = createAutoSync({isActive: () => true, hasPending: async () => await store.pendingCount(scope) > 0,
      sync: () => drainFlightQueue({store, scope, uuid: () => `operation-${++operationNumber}`, isCurrent: async () => true,
        send: async request => {
          actions.push(request.action);
          return {operation_id: request.operation_id, ...(request.action === 'delete'
            ? {deleted_id: request.flight_id}
            : {flight: {...request.data, id: request.flight_id || 1, revision: `revision-${operationNumber}`}})};
        },
      }),
    });
    await worker.network(online);
    let upload;
    const unsubscribe = localChanges.subscribe(changed => {
      if (changed === scope) upload = worker.network(online, true);
    });
    try {
      await store.save(scope, 'record', {registration: 'N172', aircraft_type: 'C172'});
      await upload;
      assert.deepEqual(actions, ['create']);
      const [saved] = await store.list(scope);
      await store.save(scope, 'record', {...saved, registration: 'N173'});
      await upload;
      assert.deepEqual(actions, ['create', 'update']);
      await store.remove(scope, 'record');
      await upload;
      assert.deepEqual(actions, ['create', 'update', 'delete']);
      assert.equal(await store.pendingCount(scope), 0);
    } finally { unsubscribe(); worker.dispose(); db.close(); }
  }
});

test('offline saves stay durable and upload on reconnect rather than failing the save', async () => {
  const db = new DatabaseSync(':memory:');
  const store = await createFlightStore(adapter(db));
  const offline = {isConnected: false, isInternetReachable: false};
  let calls = 0;
  const worker = createAutoSync({isActive: () => true, hasPending: async () => await store.pendingCount('owner') > 0,
    sync: async () => { calls++; }});
  await worker.network(offline);
  const unsubscribe = localChanges.subscribe(() => worker.network(offline, true));
  try {
    await store.save('owner', 'flight', {route: 'KAAA-KBBB'});
    assert.equal(calls, 0);
    assert.equal(await store.pendingCount('owner'), 1);
    await worker.network(online);
    assert.equal(calls, 1);
  } finally { unsubscribe(); worker.dispose(); db.close(); }
});

test('failed transactions never trigger upload and observer failures never undo a saved record', async () => {
  const db = new DatabaseSync(':memory:');
  const store = await createFlightStore(adapter(db));
  let events = 0;
  const unsubscribe = localChanges.subscribe(() => { events++; throw new Error('Network unavailable'); });
  try {
    await assert.rejects(store.remove('owner', 'missing'));
    assert.equal(events, 0);
    await store.save('owner', 'flight', {route: 'KAAA'});
    assert.equal(events, 1);
    assert.equal((await store.list('owner')).length, 1);
  } finally { unsubscribe(); db.close(); }
});
