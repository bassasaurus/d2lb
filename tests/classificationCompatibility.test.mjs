import test from 'node:test';
import assert from 'node:assert/strict';
import { DatabaseSync } from 'node:sqlite';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createFlightStore } from '../app/storage/flightStore.mjs';
import { aircraftValues } from '../app/aircraft/fields.mjs';
import { validateSummary } from '../app/stats/summary.mjs';
import { adapter } from './helpers/sqlite.mjs';

// Synthetic transport probes, not a decision about the future category codes
// or model schema. No new choices are exposed in the production form yet.
const aircraft = { id: 42, revision: 'baseline-revision', aircraft_type: 'TEST',
  aircraft_category: 'UNRECOGNIZED', aircraft_class: '',
  future_classification_details: { propulsion: 'test-only', launches: null } };

test('unfamiliar aircraft fields survive cache, form initialization, disk reopen and queued update', async () => {
  const directory = mkdtempSync(join(tmpdir(), 'd2lb-classification-audit-'));
  let db;
  try {
    const filename = join(directory, 'cache.db');
    db = new DatabaseSync(filename);
    let store = await createFlightStore(adapter(db));
    await store.cacheSnapshot('account:aircraft', [aircraft]);
    const cached = (await store.list('account:aircraft'))[0];
    const values = aircraftValues(cached);
    assert.equal(values.aircraft_category, aircraft.aircraft_category);
    assert.equal(values.aircraft_class, '');
    assert.deepEqual(values.future_classification_details, aircraft.future_classification_details);
    await store.save('account:aircraft', cached.local_id, values);
    db.close();
    db = new DatabaseSync(filename);
    store = await createFlightStore(adapter(db));
    const operation = await store.nextOperation('account:aircraft', 'audit-operation');
    const request = JSON.parse(operation.request);
    assert.equal(request.action, 'update');
    assert.equal(request.flight_id, 42);
    assert.equal(request.base_revision, 'baseline-revision');
    assert.equal(request.data.aircraft_category, aircraft.aircraft_category);
    assert.deepEqual(request.data.future_classification_details, aircraft.future_classification_details);
    assert.equal((await store.list('other-account:aircraft')).length, 0);
  } finally {
    db?.close();
    rmSync(directory, { recursive: true });
  }
});

test('a downloaded snapshot cannot discard an aircraft edit or its already queued request', async () => {
  const db = new DatabaseSync(':memory:');
  try {
    const store = await createFlightStore(adapter(db));
    await store.cacheSnapshot('account:aircraft', [aircraft]);
    await store.save('account:aircraft', 'server:42', { ...aircraft, aircraft_class: 'LOCAL-CLASS' });
    const operation = await store.nextOperation('account:aircraft', 'queued-before-refresh');
    await store.cacheSnapshot('account:aircraft', [{ ...aircraft, revision: 'new-server-revision' }]);
    const retained = await store.nextOperation('account:aircraft', 'must-not-replace-operation');
    assert.equal(retained.request, operation.request);
    assert.equal(retained.operation_id, operation.operation_id);
    assert.equal((await store.list('account:aircraft'))[0].aircraft_class, 'LOCAL-CLASS');
  } finally { db.close(); }
});

test('new summary group labels and additive metadata work with the existing version-one contract', () => {
  const snapshot = { schema_version: 1, downloaded_at: '2026-11-24T00:00:00Z',
    totals: [{ total: 'FUTURE-GROUP', total_time: '12.3', pilot_in_command: null }],
    aircraft: [{ aircraft_type: 'TEST', total_time: '12.3' }],
    future_category_metadata: [{ code: 'UNRECOGNIZED' }] };
  assert.equal(validateSummary(snapshot), snapshot);
  assert.throws(() => validateSummary({ ...snapshot, schema_version: 2 }), /Invalid summary response/);
});
