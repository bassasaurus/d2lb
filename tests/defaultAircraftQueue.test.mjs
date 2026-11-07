import test from 'node:test';
import assert from 'node:assert/strict';
import { DatabaseSync } from 'node:sqlite';
import { createFlightStore } from '../app/storage/flightStore.mjs';
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
