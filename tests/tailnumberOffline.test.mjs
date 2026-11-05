import test from 'node:test';
import assert from 'node:assert/strict';
import { DatabaseSync } from 'node:sqlite';
import { createFlightStore } from '../app/storage/flightStore.mjs';
import { adapter } from './helpers/sqlite.mjs';
import { mergeTailnumbers, tailnumberScope } from '../app/storage/tailnumberRecords.mjs';
import { drainFlightQueue } from '../app/api/syncEngine.mjs';
const tail = { aircraft: 'C172', registration: 'N987ZX', is_91: true, is_135: false, is_121: false };
test('tailnumber survives reopening the repository and cache replacement, isolated from flights and other accounts', async () => {
  const db = new DatabaseSync(':memory:');
  let store = await createFlightStore(adapter(db));
  await store.save(tailnumberScope('a'), 'local-tail', tail, { unattemptedCreateOnly: true });
  store = await createFlightStore(adapter(db));
  await store.cacheSnapshot(tailnumberScope('a'), []);
  assert.equal((await store.list(tailnumberScope('a')))[0].registration, tail.registration);
  assert.equal((await store.list('a')).length, 0);
  assert.equal((await store.list(tailnumberScope('b'))).length, 0);
  await store.moveScope(tailnumberScope('a'), tailnumberScope('account-id'));
  assert.equal((await store.list(tailnumberScope('account-id'))).length, 1);
  db.close();
});
test('lost tailnumber acknowledgement retries the same immutable operation and creates once', async () => {
  const db = new DatabaseSync(':memory:');
  const store = await createFlightStore(adapter(db));
  const scope = tailnumberScope('a');
  await store.save(scope, 'tail-uuid', tail, { unattemptedCreateOnly: true });
  const receipts = new Map(); let creates = 0, first = true;
  const send = async request => {
    if (!receipts.has(request.operation_id)) { creates++; receipts.set(request.operation_id, { operation_id: request.operation_id, flight: { ...tail, id: 17, revision: 'r1' } }); }
    if (first) { first = false; throw new Error('response lost'); }
    return receipts.get(request.operation_id);
  };
  await assert.rejects(drainFlightQueue({ store, scope, send, uuid: () => 'op-1', isCurrent: async () => true, now: () => 0 }));
  await assert.rejects(store.save(scope, 'tail-uuid', { ...tail, registration: 'N111ZX' }, { unattemptedCreateOnly: true }), /may already/);
  await drainFlightQueue({ store, scope, send, uuid: () => 'op-2', isCurrent: async () => true, now: () => 6000 });
  assert.equal(creates, 1);
  assert.equal((await store.list(scope))[0].sync_state, 'synced');
  db.close();
});
test('rejected local create can be corrected while acknowledged tailnumbers cannot be changed by the create-only flow', async () => {
  const db = new DatabaseSync(':memory:'); const store = await createFlightStore(adapter(db)); const scope = tailnumberScope('a');
  await store.save(scope, 'local', tail, { unattemptedCreateOnly: true });
  const op = await store.nextOperation(scope, 'bad');
  await store.failOperation(scope, op, 'Invalid registration', true);
  await store.save(scope, 'local', { ...tail, registration: 'N111ZX' }, { unattemptedCreateOnly: true });
  const corrected = await store.nextOperation(scope, 'good');
  assert.equal(JSON.parse(corrected.request).data.registration, 'N111ZX');
  await store.acknowledge(scope, corrected, { operation_id: 'good', flight: { ...tail, id: 7, revision: 'r' } });
  await assert.rejects(store.save(scope, 'local', tail, { unattemptedCreateOnly: true }), /may already/);
  db.close();
});
test('merged picker records preserve pending creates, prefer fresh server references and sort naturally', () => {
  const cached = [{ id: 7, registration: 'N10', aircraft: 'C172' }];
  const queued = [{ ...tail, local_id: 'new', sync_state: 'pending_create', registration: 'N2' },
    { id: 7, registration: 'N100', aircraft: 'C172', sync_state: 'synced' }];
  assert.deepEqual(mergeTailnumbers(cached, queued).map(row => row.registration), ['N2', 'N10']);
});

import { prepareLocalTailnumber } from '../app/storage/tailnumberRecords.mjs';
test('creation rejects a cached duplicate even though neither record has a local ID', () => {
  assert.throws(() => prepareLocalTailnumber(tail, [{ ...tail, id: 1 }], [], [{ aircraft_type: 'C172' }], []), /already exists/);
  assert.equal(prepareLocalTailnumber({ ...tail, registration: ' n123zx ' }, [], [], [{ aircraft_type: 'C172' }], []).registration, 'N123ZX');
});
test('pending tailnumber may keep its name but cannot rename while local flights depend on it', () => {
  const values = { ...tail, local_id: 'one' };
  const flights = [{ registration: tail.registration, sync_state: 'pending_create' }];
  const aircraft = [{ aircraft_type: 'C172' }];
  assert.equal(prepareLocalTailnumber(values, [values], flights, aircraft, []).registration, tail.registration);
  assert.throws(() => prepareLocalTailnumber({ ...values, registration: 'N111ZX' }, [values], flights, aircraft, []), /unsynced flights/);
});
test('offline duplicate creations are also rejected transactionally', async () => {
  const db = new DatabaseSync(':memory:'); const store = await createFlightStore(adapter(db)); const scope = tailnumberScope('a');
  await store.save(scope, 'one', tail, { unattemptedCreateOnly: true });
  await assert.rejects(store.save(scope, 'two', tail, { unattemptedCreateOnly: true }), /already exists/);
  assert.equal((await store.list(scope)).length, 1);
  db.close();
});
