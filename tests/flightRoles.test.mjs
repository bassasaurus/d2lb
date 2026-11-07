import test from 'node:test';
import assert from 'node:assert/strict';
import { FLIGHT_ROLES, toggleFlightRole } from '../app/forms/flightRoles.mjs';

// Web checkbox rules, with the requested Sim/XC mutual exclusion.
const webClears = {
  pilot_in_command: ['second_in_command'],
  second_in_command: ['pilot_in_command', 'solo'],
  solo: ['pilot_in_command', 'second_in_command', 'dual', 'instructor'],
  dual: ['solo', 'second_in_command', 'instructor'],
  instructor: ['dual', 'solo'], simulator: ['cross_country'], cross_country: ['simulator'],
};
for (const [field] of FLIGHT_ROLES) {
  for (const checked of [false, true]) {
    test(`${checked ? 'deselecting' : 'selecting'} ${field} follows web rules and preserves other flight values`, () => {
      const before = { ...Object.fromEntries(FLIGHT_ROLES.map(([key]) => [key, true])),
        [field]: checked, route: 'IAH-LAS', duration: '2.5' };
      const after = toggleFlightRole(before, field);
      assert.equal(after[field], !checked);
      for (const [key] of FLIGHT_ROLES.filter(([key]) => key !== field)) {
        assert.equal(after[key], !webClears[field].includes(key), key);
      }
      assert.equal(after.route, before.route);
      assert.equal(after.duration, before.duration);
      assert.equal(before[field], checked);
    });
  }
}
test('PIC can accompany Dual or CFI; selecting simulator or cross-country clears the other', () => {
  let values = toggleFlightRole({ pilot_in_command: true }, 'dual');
  assert.equal(values.pilot_in_command, true);
  assert.equal(values.dual, true);
  values = toggleFlightRole(values, 'instructor');
  assert.equal(values.pilot_in_command, true);
  assert.equal(values.dual, false);
  assert.equal(values.instructor, true);
  values = toggleFlightRole(toggleFlightRole(values, 'simulator'), 'cross_country');
  assert.equal(values.simulator, false);
  assert.equal(values.cross_country, true);
  values = toggleFlightRole(values, 'simulator');
  assert.equal(values.simulator, true);
  assert.equal(values.cross_country, false);
});

test('one primary flight role is required; optional flags alone do not qualify', async () => {
  const { hasRequiredFlightRole, PRIMARY_FLIGHT_ROLES } = await import('../app/forms/flightRoles.mjs');
  assert.equal(hasRequiredFlightRole({}), false);
  assert.equal(hasRequiredFlightRole({ instructor: true, simulator: true, cross_country: true }), false);
  for (const field of PRIMARY_FLIGHT_ROLES) assert.equal(hasRequiredFlightRole({ [field]: true }), true);
  assert.equal(hasRequiredFlightRole({ pilot_in_command: true, dual: true }), true);
  assert.equal(hasRequiredFlightRole(toggleFlightRole({ solo: true }, 'solo')), false);
});
