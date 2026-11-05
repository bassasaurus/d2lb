import test from 'node:test';
import assert from 'node:assert/strict';
import { lastAircraftType } from '../app/storage/flightDefaults.mjs';
const data = { preferred: 'C172', aircraft: [{ aircraft_type: 'C172' }, { aircraft_type: 'A320' }], tailnumbers: [], flights: [{ aircraft_type: 'A320' }] };
test('last used preference wins over latest dated flight', () => {
  assert.equal(lastAircraftType(data), 'C172');
});
test('missing/deleted preference falls back to latest available flight type', () => {
  assert.equal(lastAircraftType({ ...data, preferred: 'DELETED' }), 'A320');
  assert.equal(lastAircraftType({ ...data, preferred: undefined }), 'A320');
});
test('empty account remains blank and reference-only aircraft are supported', () => {
  assert.equal(lastAircraftType({ preferred: 'C172', aircraft: [], tailnumbers: [], flights: [] }), '');
  assert.equal(lastAircraftType({ preferred: 'C172', aircraft: [], tailnumbers: [{ aircraft: 'C172' }], flights: [] }), 'C172');
});
