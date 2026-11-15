import test from 'node:test';
import assert from 'node:assert/strict';
import { defaultAircraftType, selectedDefaultType, aircraftWithDefault } from '../app/storage/flightDefaults.mjs';
const data = { aircraft: [{ aircraft_type: 'C172' }, { aircraft_type: 'A320', is_default: true }], tailnumbers: [] };
test('server default selects an available aircraft', () => {
  assert.equal(defaultAircraftType(data), 'A320');
});
test('no server selection leaves aircraft blank; last-used preferences are ignored', () => {
  assert.equal(defaultAircraftType({ ...data, aircraft: [{ aircraft_type: 'C172' }], preferred: 'C172', flights: [{ aircraft_type: 'C172' }] }), '');
});
test('pending default selection and clearing override the last downloaded flags', () => {
  const aircraft = [...data.aircraft, { _default_preference: true, aircraft_type: 'C172', sync_state: 'pending_update' }];
  assert.equal(defaultAircraftType({ ...data, aircraft }), 'C172');
  aircraft[2].aircraft_type = '';
  assert.equal(selectedDefaultType(aircraft), '');
  assert.equal(defaultAircraftType({ ...data, aircraft }), '');
});
test('unavailable selected aircraft does not get prefilled', () => {
  assert.equal(defaultAircraftType({ aircraft: [{ _default_preference: true, aircraft_type: 'DELETED' }], tailnumbers: [] }), '');
});

test('only one aircraft row can be displayed as default even with stale duplicate flags or codes', () => {
  const rows = [{ local_id: 'one', aircraft_type: 'A320', is_default: true },
    { local_id: 'two', aircraft_type: 'C172', is_default: true },
    { local_id: 'duplicate', aircraft_type: 'C172', is_default: true }];
  const projected = aircraftWithDefault(rows, 'C172');
  assert.deepEqual(projected.filter(row => row.is_default).map(row => row.local_id), ['two']);
  assert.equal(aircraftWithDefault(rows, '').some(row => row.is_default), false);
  assert.equal(rows.filter(row => row.is_default).length, 3); // Presentation does not mutate cached records.
});
