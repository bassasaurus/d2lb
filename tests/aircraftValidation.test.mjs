import test from 'node:test';
import assert from 'node:assert/strict';
import { aircraftSchema } from '../app/aircraft/validation.mjs';
const valid = { aircraft_type: 'C172', aircraft_category: 'A', aircraft_class: 'SEL', piston: true, turbine: false, small: true };

test('aircraft requires type, category, class, and exactly one engine and weight', () => {
  assert.equal(aircraftSchema.isValidSync(valid), true);
  for (const key of ['aircraft_type', 'aircraft_category', 'aircraft_class']) {
    assert.equal(aircraftSchema.isValidSync({ ...valid, [key]: '' }), false, key);
  }
  assert.equal(aircraftSchema.isValidSync({ ...valid, piston: false }), false);
  assert.equal(aircraftSchema.isValidSync({ ...valid, turbine: true }), false);
  assert.equal(aircraftSchema.isValidSync({ ...valid, piston: false, turbine: true }), true);
  assert.equal(aircraftSchema.isValidSync({ ...valid, small: false }), false);
  assert.equal(aircraftSchema.isValidSync({ ...valid, heavy: true }), false);
  assert.equal(aircraftSchema.isValidSync({ ...valid, small: false, heavy: true }), true);
});
test('aircraft category and class must agree, with optional flags remaining optional', () => {
  assert.equal(aircraftSchema.isValidSync({ ...valid, aircraft_class: 'HELO' }), false);
  assert.equal(aircraftSchema.isValidSync({ ...valid, aircraft_category: 'R', aircraft_class: 'HELO' }), true);
  assert.equal(aircraftSchema.isValidSync({ ...valid, aircraft_type: 'TOO-LONG-123' }), false);
});
