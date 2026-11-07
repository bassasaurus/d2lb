import test from 'node:test';
import assert from 'node:assert/strict';
import { defaultAircraftType, selectedDefaultType } from '../app/storage/flightDefaults.mjs';
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
