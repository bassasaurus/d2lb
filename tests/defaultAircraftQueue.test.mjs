import test from 'node:test';
import assert from 'node:assert/strict';
import { DatabaseSync } from 'node:sqlite';
import { createFlightStore } from '../app/storage/flightStore.mjs';
import { aircraftWithDefault } from '../app/storage/flightDefaults.mjs';
import { adapter } from './helpers/sqlite.mjs';
const preference = { id: -1, revision: 'empty-default', _default_preference: true, aircraft_type: '' };
test('default shares aircraft queue but uploads after aircraft records, including retries', async () => {
  const db = new DatabaseSync(':memory:');
  try {
    const store = await createFlightStore(adapter(db));
    await store.cacheSnapshot('a:aircraft', [preference]);
    await store.save('a:aircraft', 'server:-1', { ...preference, aircraft_type: 'C172' });
    await store.save('a:aircraft', 'new-type', { aircraft_type: 'C172' });
    const aircraft = await store.nextOperation('a:aircraft', 'aircraft-op', 0, 'aircraft-records');
    assert.equal(JSON.parse(aircraft.request).data.aircraft_type, 'C172');
    assert.equal(JSON.parse(aircraft.request).data._default_preference, undefined);
    const selected = await store.nextOperation('a:aircraft', 'default-op', 0, 'aircraft-default');
    assert.equal(JSON.parse(selected.request).data._default_preference, true);
    assert.equal(JSON.parse(selected.request).base_revision, 'empty-default');
    assert.equal(await store.pendingCount('a:aircraft'), 2);
  } finally { db.close(); }
});
test('server refresh retains offline selection and acknowledges the latest choice safely', async () => {
  const db = new DatabaseSync(':memory:');
  try {
    const store = await createFlightStore(adapter(db));
    await store.cacheSnapshot('a', [{ id: 1, aircraft_type: 'C172' }, preference]);
    await store.save('a', 'server:-1', { ...preference, aircraft_type: 'C172' });
    const operation = await store.nextOperation('a', 'first', 0, 'aircraft-default');
    await store.save('a', 'server:-1', { ...preference, aircraft_type: 'A320' });
    await store.acknowledge('a', operation, { operation_id: 'first', flight: { ...preference, aircraft_type: 'C172', revision: 'selected-c172' } });
    const next = JSON.parse((await store.nextOperation('a', 'second', 0, 'aircraft-default')).request);
    assert.equal(next.data.aircraft_type, 'A320');
    assert.equal(next.base_revision, 'selected-c172');
    await store.cacheSnapshot('a', [{ id: 1, aircraft_type: 'C172' }, { ...preference, aircraft_type: 'C172' }]);
    assert.equal((await store.list('a')).find(row => row._default_preference).aircraft_type, 'A320');
    assert.equal((await store.list('a')).find(row => row.id === 1).aircraft_type, 'C172');
    assert.equal((await store.list('b')).length, 0);
  } finally { db.close(); }
});
test('default conflicts use existing refresh, archive and rebase resolution', async () => {
  const db = new DatabaseSync(':memory:');
  try {
    const store = await createFlightStore(adapter(db));
    await store.cacheSnapshot('a', [preference]);
    await store.save('a', 'server:-1', { ...preference, aircraft_type: 'C172' });
    const operation = await store.nextOperation('a', 'conflict', 0, 'aircraft-default');
    await store.failOperation('a', operation, 'Changed on server', true, 0);
    const row = await store.reviewRecord('a', 'server:-1');
    const server = { ...preference, aircraft_type: 'A320', revision: 'server-choice' };
    await store.captureServer('a', 'server:-1', row.generation, server);
    await store.resolveReview('a', 'server:-1', row.generation, 'keep_local', 'server-choice');
    const retried = JSON.parse((await store.nextOperation('a', 'resolved', 0, 'aircraft-default')).request);
    assert.equal(retried.data.aircraft_type, 'C172');
    assert.equal(retried.base_revision, 'server-choice');
    assert.equal((await store.reviewHistory('a')).length, 1);
  } finally { db.close(); }
});

test('SQLite rejects a second preference for one account while allowing other accounts', async () => {
  const db = new DatabaseSync(':memory:');
  try {
    const store = await createFlightStore(adapter(db));
    await store.cacheSnapshot('a:aircraft', [preference]);
    await store.cacheSnapshot('b:aircraft', [preference]);
    const insert = db.prepare('INSERT INTO mobile_flights(scope,local_id,payload,state) VALUES(?,?,?,?)');
    assert.throws(() => insert.run('a:aircraft', 'other-key', JSON.stringify(preference), 'pending_update'), /UNIQUE/);
    await assert.rejects(store.save('a:aircraft', 'other-key', preference), /account preference record/);
    assert.equal((await store.list('a:aircraft')).filter(row => row._default_preference).length, 1);
    assert.equal((await store.list('b:aircraft')).filter(row => row._default_preference).length, 1);
  } finally { db.close(); }
});

test('switching and clearing an offline default overrides old downloaded flags through acknowledgment', async () => {
  const db = new DatabaseSync(':memory:');
  try {
    const store = await createFlightStore(adapter(db));
    const records = [{ id: 1, aircraft_type: 'A320', is_default: true }, { id: 2, aircraft_type: 'C172' }];
    await store.cacheSnapshot('a:aircraft', [...records, { ...preference, aircraft_type: 'A320' }]);
    await store.save('a:aircraft', 'server:-1', { ...preference, aircraft_type: 'C172' });
    const selected = () => store.list('a:aircraft').then(rows => aircraftWithDefault(rows).filter(row => row.is_default).map(row => row.aircraft_type));
    assert.deepEqual(await selected(), ['C172']);
    const operation = await store.nextOperation('a:aircraft', 'choose-c172', 0, 'aircraft-default');
    await store.acknowledge('a:aircraft', operation, { operation_id: 'choose-c172',
      flight: { ...preference, aircraft_type: 'C172', revision: 'confirmed-c172' } });
    await store.cacheSnapshot('a:aircraft', [...records, { ...preference, aircraft_type: 'C172', revision: 'confirmed-c172' }]);
    assert.deepEqual(await selected(), ['C172']);
    await store.save('a:aircraft', 'server:-1', { ...preference, aircraft_type: '' });
    assert.deepEqual(await selected(), []);
    assert.equal((await store.list('a:aircraft')).filter(row => row._default_preference).length, 1);
  } finally { db.close(); }
});

test('invalid server snapshots preserve pending defaults and cached aircraft', async () => {
  const db = new DatabaseSync(':memory:');
  try {
    const store = await createFlightStore(adapter(db));
    await store.cacheSnapshot('a:aircraft', [{ id: 1, aircraft_type: 'A320' }, preference]);
    await store.save('a:aircraft', 'server:-1', { ...preference, aircraft_type: 'A320' });
    const before = await store.list('a:aircraft');
    for (const invalid of [[preference, preference], [{ id: 1, aircraft_type: 'A320', is_default: true },
      { id: 2, aircraft_type: 'C172', is_default: true }]]) {
      await assert.rejects(store.cacheSnapshot('a:aircraft', invalid), /More than one default/);
      assert.deepEqual(await store.list('a:aircraft'), before);
    }
  } finally { db.close(); }
});

test('version-3 upgrade preserves offline default and immutable queued operation', async () => {
  const db = new DatabaseSync(':memory:');
  try {
    let store = await createFlightStore(adapter(db));
    await store.cacheSnapshot('a:aircraft', [preference]);
    await store.save('a:aircraft', 'server:-1', { ...preference, aircraft_type: 'C172' });
    await store.nextOperation('a:aircraft', 'persisted-default', 0, 'aircraft-default');
    const operation = db.prepare('SELECT * FROM mobile_operations').get();
    const rows = await store.list('a:aircraft');
    db.exec('DROP INDEX mobile_one_default_preference; PRAGMA user_version=3;');
    store = await createFlightStore(adapter(db));
    assert.deepEqual(await store.list('a:aircraft'), rows);
    assert.deepEqual(await store.nextOperation('a:aircraft', 'do-not-replace', 0, 'aircraft-default'), operation);
    assert.equal(db.prepare('PRAGMA user_version').get().user_version, 5);
  } finally { db.close(); }
});

test('duplicate legacy preferences abort upgrade without deleting any offline data', async () => {
  const db = new DatabaseSync(':memory:');
  try {
    await createFlightStore(adapter(db));
    db.exec('DROP INDEX mobile_one_default_preference; PRAGMA user_version=3;');
    const insert = db.prepare("INSERT INTO mobile_flights(scope,local_id,payload,state) VALUES(?,?,?,'pending_update')");
    insert.run('a:aircraft', 'server:-1', JSON.stringify(preference));
    insert.run('a:aircraft', 'older-key', JSON.stringify({ ...preference, aircraft_type: 'C172' }));
    const before = db.prepare('SELECT * FROM mobile_flights ORDER BY local_id').all();
    await assert.rejects(createFlightStore(adapter(db)), /UNIQUE/);
    assert.deepEqual(db.prepare('SELECT * FROM mobile_flights ORDER BY local_id').all(), before);
    assert.equal(db.prepare('PRAGMA user_version').get().user_version, 3);
  } finally { db.close(); }
});
