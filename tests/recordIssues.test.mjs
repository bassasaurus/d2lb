import test from 'node:test';
import assert from 'node:assert/strict';
import { DatabaseSync } from 'node:sqlite';
import { adapter } from './helpers/sqlite.mjs';
import { createFlightStore } from '../app/storage/flightStore.mjs';
import { isValidationIssue, validationMessages } from '../app/sync/issuePresentation.mjs';

test('only blocked records require user intervention; network failures and corrected records do not', async () => {
  const db = new DatabaseSync(':memory:');
  const store = await createFlightStore(adapter(db));
  await store.save('a', 'flight', { route: 'IAH-LAS' });
  const operation = await store.nextOperation('a', 'upload', 100);
  await store.failOperation('a', operation, 'Offline', false, 100);
  assert.equal((await store.list('a'))[0].needs_attention, false);
  await store.failOperation('a', operation, 'Correct route', true, 100, { route: ['Unknown airport'] });
  assert.equal((await store.list('a'))[0].needs_attention, true);
  assert.equal((await store.list('b')).length, 0);
  await store.save('a', 'flight', { ...(await store.list('a'))[0], route: 'LAS-IAH' });
  assert.equal((await store.list('a'))[0].needs_attention, false);
  const payload = JSON.parse(db.prepare('SELECT payload FROM mobile_flights WHERE local_id=?').get('flight').payload);
  assert.equal('needs_attention' in payload, false);
  db.close();
});

test('blocked deletion retains the affected record for review', async () => {
  const db = new DatabaseSync(':memory:');
  const store = await createFlightStore(adapter(db));
  await store.cacheSnapshot('a', [{ id: 7, revision: 'one', route: 'IAH-LAS' }]);
  await store.remove('a', 'server:7');
  const operation = await store.nextOperation('a', 'delete');
  await store.failOperation('a', operation, 'Changed online', true, 100);
  const deleted = await store.deletedRecords('a');
  assert.equal(deleted[0].needs_attention, true);
  assert.equal(deleted[0].sync_state, 'pending_delete');
  db.close();
});

test('conflict versions remain selectable for deleted flights and aircraft/default changes', () => {
  for (const response of [{ code: 'flight_missing' }, { code: 'flight_conflict' },
    { detail: 'Aircraft changed on the server. Review before syncing.' },
    { detail: 'Default aircraft changed on the server. Review before syncing.' },
    { detail: 'Aircraft no longer available.' }, { _http_status: 409 }]) {
    assert.equal(isValidationIssue(response), false);
  }
  assert.equal(isValidationIssue({ route: ['Invalid airport'], _http_status: 400 }), true);
  assert.deepEqual(validationMessages({ route: ['Invalid airport'], _http_status: 400 }), ['route: Invalid airport']);
  assert.deepEqual(validationMessages({ code: 'flight_conflict', server_flight: { remarks: 'Private fields' } }), []);
});
