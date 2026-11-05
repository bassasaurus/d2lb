import test from 'node:test';
import assert from 'node:assert/strict';
import { DatabaseSync } from 'node:sqlite';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { adapter } from './helpers/sqlite.mjs';
import { createFlightStore } from '../app/storage/flightStore.mjs';

const original = { id: 7, revision: 'old', date: '11/04/2026', route: 'IAH-LAS', remarks: 'original' };
const server = { ...original, revision: 'server-new', remarks: 'website edit' };
async function conflict(db, scope = 'a') {
  const store = await createFlightStore(adapter(db));
  await store.cacheSnapshot(scope, [original]);
  await store.save(scope, 'server:7', { ...original, remarks: 'local edit' });
  const operation = await store.nextOperation(scope, 'old-operation');
  await store.failOperation(scope, operation, 'Changed on the website', true, 0, { code: 'flight_conflict', server_flight: server });
  return store;
}

test('keep-local resolution archives both versions and retries against the compared revision with a new ID', async () => {
  const db = new DatabaseSync(':memory:');
  const store = await conflict(db);
  const item = await store.reviewRecord('a', 'server:7');
  assert.equal(item.can_resolve, true);
  await store.resolveReview('a', item.local_id, item.generation, 'keep_local', 'server-new');
  const operation = await store.nextOperation('a', 'new-operation');
  const request = JSON.parse(operation.request);
  assert.equal(operation.operation_id, 'new-operation');
  assert.equal(request.base_revision, 'server-new');
  assert.equal(request.data.remarks, 'local edit');
  const history = await store.reviewHistory('a');
  assert.equal(history[0].local_record.remarks, 'local edit');
  assert.equal(history[0].server_record.remarks, 'website edit');
  assert.deepEqual(await store.reviewHistory('other-account'), []);
  db.close();
});

test('use-server resolution clears only this pending change and preserves its local copy', async () => {
  const db = new DatabaseSync(':memory:');
  const store = await conflict(db);
  const item = await store.reviewRecord('a', 'server:7');
  await store.save('a', 'other-local', { remarks: 'another pending flight' });
  await store.resolveReview('a', item.local_id, item.generation, 'use_server', 'server-new');
  assert.equal(await store.pendingCount('a'), 1);
  assert.equal((await store.list('a')).find(row => row.id === 7).remarks, 'website edit');
  assert.equal((await store.reviewHistory('a'))[0].local_record.remarks, 'local edit');
  db.close();
});

test('a comparison cannot overwrite a newer local edit or an uncertain upload', async () => {
  const db = new DatabaseSync(':memory:');
  const store = await conflict(db);
  const item = await store.reviewRecord('a', 'server:7');
  await assert.rejects(store.resolveReview('a', item.local_id, item.generation, 'keep_local', 'wrong-revision'));
  await store.save('a', item.local_id, { ...item, remarks: 'new local edit' });
  await assert.rejects(store.resolveReview('a', item.local_id, item.generation, 'use_server', 'server-new'), /changed/);
  const operation = await store.nextOperation('a', 'retry');
  await store.failOperation('a', operation, 'timeout', false);
  const current = await store.reviewRecord('a', item.local_id);
  await assert.rejects(store.resolveReview('a', item.local_id, current.generation, 'discard_local', null), /uncertain/);
  assert.equal((await store.list('a'))[0].remarks, 'new local edit');
  assert.deepEqual(await store.reviewHistory('a'), []);
  db.close();
});

test('a deleted server record can be recreated only by explicit choice with old IDs removed', async () => {
  const db = new DatabaseSync(':memory:');
  const store = await conflict(db);
  const item = await store.reviewRecord('a', 'server:7');
  await store.captureServer('a', item.local_id, item.generation, null);
  await assert.rejects(store.resolveReview('a', item.local_id, item.generation, 'keep_local', null), /deleted/);
  await store.resolveReview('a', item.local_id, item.generation, 'recreate', null);
  const operation = await store.nextOperation('a', 'new-create');
  const request = JSON.parse(operation.request);
  assert.equal(request.action, 'create');
  assert.equal(request.data.id, undefined);
  assert.equal(request.data.revision, undefined);
  assert.equal(request.data.remarks, 'local edit');
  db.close();
});

test('a deletion conflict rebases the deletion, not an update, and may also accept server deletion', async () => {
  const db = new DatabaseSync(':memory:');
  const store = await conflict(db);
  await store.remove('a', 'server:7');
  const item = await store.reviewRecord('a', 'server:7');
  await store.failOperation('a', await store.nextOperation('a', 'unused'), 'changed', true, 0, { server_flight: server });
  const latest = await store.reviewRecord('a', 'server:7');
  await store.resolveReview('a', latest.local_id, latest.generation, 'keep_local', 'server-new');
  const deletion = await store.nextOperation('a', 'new-deletion');
  assert.equal(JSON.parse(deletion.request).action, 'delete');
  await store.failOperation('a', deletion, 'missing', true, 0, { code: 'flight_missing' });
  const missing = await store.reviewRecord('a', 'server:7');
  await store.captureServer('a', missing.local_id, missing.generation, null);
  await store.resolveReview('a', missing.local_id, missing.generation, 'use_server', null);
  assert.equal(await store.pendingCount('a'), 0);
  assert.equal((await store.reviewHistory('a')).length, 2);
  db.close();
});

test('resolution rollback retains both queue and local edit if archiving fails', async () => {
  const db = new DatabaseSync(':memory:');
  const store = await conflict(db);
  db.exec("CREATE TRIGGER reject_archive BEFORE INSERT ON mobile_review_history BEGIN SELECT RAISE(ABORT,'disk failure'); END;");
  const item = await store.reviewRecord('a', 'server:7');
  await assert.rejects(store.resolveReview('a', item.local_id, item.generation, 'use_server', 'server-new'));
  assert.equal((await store.reviewRecord('a', item.local_id)).can_resolve, true);
  assert.equal((await store.list('a'))[0].remarks, 'local edit');
  assert.equal(await store.pendingCount('a'), 1);
  db.close();
});

test('resolution history and snapshots survive closing and reopening SQLite', async () => {
  const directory = mkdtempSync(join(tmpdir(), 'd2lb-review-'));
  try {
    const filename = join(directory, 'review.db');
    let db = new DatabaseSync(filename);
    let store = await conflict(db, 'a:aircraft');
    const item = await store.reviewRecord('a:aircraft', 'server:7');
    db.close();
    db = new DatabaseSync(filename);
    store = await createFlightStore(adapter(db));
    assert.equal((await store.reviewRecord('a:aircraft', 'server:7')).server_record.remarks, 'website edit');
    await store.resolveReview('a:aircraft', item.local_id, item.generation, 'use_server', 'server-new');
    db.close();
    db = new DatabaseSync(filename);
    store = await createFlightStore(adapter(db));
    assert.equal((await store.reviewHistory('a:aircraft')).length, 1);
    assert.equal(db.prepare('PRAGMA user_version').get().user_version, 3);
    db.close();
  } finally { rmSync(directory, { recursive: true }); }
});

test('upgrading the deployed version-2 database preserves its record and immutable upload', async () => {
  const db = new DatabaseSync(':memory:');
  db.exec(`CREATE TABLE mobile_flights(scope TEXT NOT NULL,local_id TEXT NOT NULL,payload TEXT NOT NULL,state TEXT NOT NULL,generation INTEGER NOT NULL DEFAULT 0,sync_error TEXT,PRIMARY KEY(scope,local_id));
    CREATE TABLE mobile_operations(scope TEXT NOT NULL,local_id TEXT NOT NULL,operation_id TEXT NOT NULL,request TEXT NOT NULL,generation INTEGER NOT NULL,attempts INTEGER NOT NULL DEFAULT 0,retry_at INTEGER NOT NULL DEFAULT 0,blocked INTEGER NOT NULL DEFAULT 0,PRIMARY KEY(scope,local_id),UNIQUE(scope,operation_id));
    PRAGMA user_version=2;`);
  const request = JSON.stringify({ operation_id: 'persisted-operation', action: 'create', data: { route: 'IAH-LAS' } });
  db.prepare('INSERT INTO mobile_flights(scope,local_id,payload,state) VALUES(?,?,?,?)').run('a', 'one', '{"route":"IAH-LAS"}', 'pending_create');
  db.prepare('INSERT INTO mobile_operations(scope,local_id,operation_id,request,generation) VALUES(?,?,?,?,?)').run('a', 'one', 'persisted-operation', request, 0);
  const store = await createFlightStore(adapter(db));
  assert.equal((await store.list('a'))[0].route, 'IAH-LAS');
  assert.equal((await store.nextOperation('a', 'must-not-replace')).request, request);
  assert.equal(db.prepare('PRAGMA user_version').get().user_version, 3);
  assert.deepEqual(await store.reviewHistory('a'), []);
  db.close();
});
