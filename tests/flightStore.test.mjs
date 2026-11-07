import test from 'node:test';
import assert from 'node:assert/strict';
import { DatabaseSync } from 'node:sqlite';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createFlightStore } from '../app/storage/flightStore.mjs';

import { adapter } from './helpers/sqlite.mjs';

const flight = { date: '11/04/2026', route: 'IAH-LAS', duration: '3.0', approaches: [] };

test('pending flight survives database close and reopen with its stable ID', async () => {
  const directory = mkdtempSync(join(tmpdir(), 'd2lb-sqlite-'));
  try {
    let db = new DatabaseSync(join(directory, 'logbook.db'));
    let store = await createFlightStore(adapter(db));
    await store.save('account-a', 'uuid-one', flight);
    db.close();
    db = new DatabaseSync(join(directory, 'logbook.db'));
    store = await createFlightStore(adapter(db));
    assert.equal((await store.list('account-a'))[0].local_id, 'uuid-one');
    assert.equal(await store.pendingCount('account-a'), 1);
    db.close();
  } finally { rmSync(directory, { recursive: true }); }
});

test('download refresh preserves local edits and deletion tombstones', async () => {
  const db = new DatabaseSync(':memory:');
  const store = await createFlightStore(adapter(db));
  await store.cacheSnapshot('a', [{ ...flight, id: 1 }, { ...flight, id: 2 }]);
  await store.save('a', 'server:1', { ...flight, id: 1, remarks: 'local edit' });
  await store.remove('a', 'server:2');
  await store.cacheSnapshot('a', [{ ...flight, id: 1, remarks: 'server edit' }, { ...flight, id: 2 }]);
  const rows = await store.list('a');
  assert.equal(rows.length, 1);
  assert.equal(rows[0].remarks, 'local edit');
  assert.equal(await store.pendingCount('a'), 2);
  db.close();
});

test('invalid download preserves cached records; references and flights are account-isolated', async () => {
  const db = new DatabaseSync(':memory:');
  const store = await createFlightStore(adapter(db));
  await store.cacheSnapshot('a', [{ ...flight, id: 1 }]);
  await assert.rejects(store.cacheSnapshot('a', [{ route: 'invalid' }]));
  assert.equal((await store.list('a')).length, 1);
  assert.deepEqual(await store.list('b'), []);
  await store.cacheReference('a', 'tailnumbers', [{ registration: 'N1234' }]);
  assert.deepEqual(await store.reference('b', 'tailnumbers'), []);
  await assert.rejects(store.list(''));
  db.close();
});

test('failed snapshot transaction rolls back deletion of previous cache', async () => {
  const db = new DatabaseSync(':memory:');
  const store = await createFlightStore(adapter(db));
  await store.cacheSnapshot('a', [{ ...flight, id: 1 }]);
  db.exec("CREATE TRIGGER fail_insert BEFORE INSERT ON mobile_flights WHEN NEW.local_id='server:2' BEGIN SELECT RAISE(ABORT,'disk error'); END;");
  await assert.rejects(store.cacheSnapshot('a', [{ ...flight, id: 2 }]));
  assert.equal((await store.list('a'))[0].id, 1);
  db.close();
});

test('editing a new local flight reuses its queue entry; deleting it cancels the pending create', async () => {
  const db = new DatabaseSync(':memory:');
  const store = await createFlightStore(adapter(db));
  await store.save('a', 'uuid-one', flight);
  await store.save('a', 'uuid-one', { ...flight, remarks: 'corrected' });
  assert.equal(await store.pendingCount('a'), 1);
  assert.equal((await store.list('a'))[0].remarks, 'corrected');
  await store.remove('a', 'uuid-one');
  assert.equal(await store.pendingCount('a'), 0);
  db.close();
});

test('newer database schemas are rejected without changing their version', async () => {
  const db = new DatabaseSync(':memory:');
  db.exec('PRAGMA user_version=4');
  await assert.rejects(createFlightStore(adapter(db)), /newer app/);
  assert.equal(db.prepare('PRAGMA user_version').get().user_version, 4);
  db.close();
});

test('manual retry bypasses backoff for the current account and keeps review blocks', async () => {
  const db = new DatabaseSync(':memory:');
  const store = await createFlightStore(adapter(db));
  for (const [scope, blocked] of [['a', false], ['a:aircraft', true], ['b', false]]) {
    await store.save(scope, 'local-one', flight);
    const operation = await store.nextOperation(scope, `op-${scope}`, 100);
    await store.failOperation(scope, operation, 'Sync failed', blocked, 100);
  }
  await store.retryPendingOperations(['a', 'a:aircraft', 'a:tailnumbers']);
  assert.equal((await store.nextOperation('a', 'replacement', 101)).operation_id, 'op-a');
  assert.equal(await store.nextOperation('a:aircraft', 'replacement', 6000), undefined);
  assert.equal(await store.nextOperation('b', 'replacement', 101), undefined);
  db.close();
});

test('an unacknowledged operation is immutable across local edits and survives retries', async () => {
  const db = new DatabaseSync(':memory:');
  const store = await createFlightStore(adapter(db));
  await store.save('a', 'local-one', flight);
  const operation = await store.nextOperation('a', 'op-one', 100);
  await store.save('a', 'local-one', { ...flight, remarks: 'edited during upload' });
  await store.failOperation('a', operation, 'timeout', false, 100);
  assert.equal(await store.nextOperation('a', 'different-id', 101), undefined);
  const retry = await store.nextOperation('a', 'different-id', 6000);
  assert.equal(retry.operation_id, 'op-one');
  assert.equal(retry.request, operation.request);
  await store.acknowledge('a', retry, { operation_id: 'op-one', flight: { ...flight, id: 9, revision: 'rev-one' } });
  const row = (await store.list('a'))[0];
  assert.equal(row.remarks, 'edited during upload');
  assert.equal(row.id, 9);
  assert.equal(row.sync_state, 'pending_update');
  const update = await store.nextOperation('a', 'op-two', 7000);
  assert.equal(JSON.parse(update.request).action, 'update');
  assert.equal(JSON.parse(update.request).base_revision, 'rev-one');
  db.close();
});

test('deleting a create in flight waits for its acknowledgement then queues a server delete', async () => {
  const db = new DatabaseSync(':memory:');
  const store = await createFlightStore(adapter(db));
  await store.save('a', 'one', flight);
  const create = await store.nextOperation('a', 'op-one');
  await store.remove('a', 'one');
  assert.equal(await store.pendingCount('a'), 1);
  assert.deepEqual(await store.list('a'), []);
  await store.acknowledge('a', create, { operation_id: 'op-one', flight: { ...flight, id: 9, revision: 'rev' } });
  const deletion = await store.nextOperation('a', 'op-two');
  assert.equal(JSON.parse(deletion.request).action, 'delete');
  await store.acknowledge('a', deletion, { operation_id: 'op-two', deleted_id: 9 });
  assert.equal(await store.pendingCount('a'), 0);
  db.close();
});

test('invalid acknowledgement preserves the queue; stable account transition retains pending records', async () => {
  const db = new DatabaseSync(':memory:');
  const store = await createFlightStore(adapter(db));
  await store.save('token-scope', 'one', flight);
  const operation = await store.nextOperation('token-scope', 'op-one');
  await assert.rejects(store.acknowledge('token-scope', operation, { operation_id: 'wrong' }));
  await store.moveScope('token-scope', 'account-scope');
  assert.equal(await store.pendingCount('account-scope'), 1);
  assert.equal(await store.pendingCount('token-scope'), 0);
  assert.equal((await store.nextOperation('account-scope', 'new-id')).operation_id, 'op-one');
  db.close();
});

test('queued operation survives closing the database after an uncertain upload', async () => {
  const directory = mkdtempSync(join(tmpdir(), 'd2lb-retry-'));
  try {
    const filename = join(directory, 'logbook.db');
    let db = new DatabaseSync(filename);
    let store = await createFlightStore(adapter(db));
    await store.save('a', 'one', flight);
    const operation = await store.nextOperation('a', 'permanent-operation', 0);
    await store.failOperation('a', operation, 'response lost', false, 0);
    db.close();
    db = new DatabaseSync(filename);
    store = await createFlightStore(adapter(db));
    const retry = await store.nextOperation('a', 'must-not-replace-id', 6000);
    assert.equal(retry.operation_id, 'permanent-operation');
    assert.equal(retry.request, operation.request);
    db.close();
  } finally { rmSync(directory, { recursive: true }); }
});

test('aircraft cache and pending changes remain separate from flight snapshots', async () => {
  const db = new DatabaseSync(':memory:');
  const store = await createFlightStore(adapter(db));
  await store.save('account:aircraft', 'aircraft-one', { aircraft_type: 'C172' });
  await store.cacheSnapshot('account', [{ ...flight, id: 1 }]);
  await store.cacheSnapshot('account:aircraft', [{ id: 2, aircraft_type: 'C182', revision: 'revision' }]);
  assert.equal((await store.list('account')).length, 1);
  assert.equal((await store.list('account:aircraft')).length, 2);
  assert.equal(await store.pendingCount('account:aircraft'), 1);
  assert.deepEqual(await store.list('another-account:aircraft'), []);
  db.close();
});

test('uncertain deletions cannot be cancelled, but rejected deletions can be restored', async () => {
  const db = new DatabaseSync(':memory:');
  const store = await createFlightStore(adapter(db));
  await store.cacheSnapshot('account:aircraft', [{ id: 2, aircraft_type: 'C172', revision: 'revision' }]);
  await store.remove('account:aircraft', 'server:2');
  const operation = await store.nextOperation('account:aircraft', 'delete-operation', 0);
  await assert.rejects(store.cancelDeletion('account:aircraft', 'server:2'), /Reconnect/);
  assert.equal((await store.deletedRecords('account:aircraft')).length, 1);
  await store.failOperation('account:aircraft', operation, 'Aircraft is in use', true, 0);
  await store.cancelDeletion('account:aircraft', 'server:2');
  assert.equal((await store.deletedRecords('account:aircraft')).length, 0);
  assert.equal((await store.list('account:aircraft'))[0].aircraft_type, 'C172');
  db.close();
});

test('snapshot keeps an uploaded flight local key so its pending-to-synced card can animate', async () => {
  const db = new DatabaseSync(':memory:');
  const store = await createFlightStore(adapter(db));
  await store.save('a', 'new-flight-uuid', flight);
  const pending = (await store.list('a'))[0];
  const operation = await store.nextOperation('a', 'create-operation', 100);
  const server = { ...flight, id: 99, revision: 'saved' };
  await store.acknowledge('a', operation, { operation_id: 'create-operation', flight: server });
  await store.cacheSnapshot('a', [server]);
  const synced = (await store.list('a'))[0];
  assert.equal(pending.sync_state, 'pending_create');
  assert.equal(synced.sync_state, 'synced');
  assert.equal(synced.local_id, pending.local_id);
  await store.cacheSnapshot('a', [{ ...server, revision: 'updated', remarks: 'Website change' }]);
  assert.equal((await store.list('a'))[0].local_id, 'new-flight-uuid');
  assert.equal((await store.list('a'))[0].remarks, 'Website change');
  await store.cacheSnapshot('b', [server]);
  assert.equal((await store.list('b'))[0].local_id, 'server:99');
  db.close();
});
