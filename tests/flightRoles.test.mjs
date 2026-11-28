import test from 'node:test';
import assert from 'node:assert/strict';
import { FLIGHT_ROLES, toggleFlightRole, isFlightRoleDisabled, flightCrewLabel } from '../app/forms/flightRoles.mjs';

// Web checkbox rules, with the requested Sim/XC mutual exclusion.
const webClears = {
  pilot_in_command: ['second_in_command'],
  second_in_command: ['pilot_in_command', 'solo'],
  solo: ['second_in_command', 'dual', 'instructor'],
  dual: ['solo', 'second_in_command', 'instructor'],
  instructor: ['dual', 'solo'], simulator: ['cross_country'], cross_country: ['simulator'],
};
for (const [field] of FLIGHT_ROLES) {
  for (const checked of [false, true]) {
    test(`${checked ? 'deselecting' : 'selecting'} ${field} follows web rules and preserves other flight values`, () => {
      const before = { ...Object.fromEntries(FLIGHT_ROLES.map(([key]) => [key, true])),
        [field]: checked, route: 'IAH-LAS', duration: '2.5' };
      const after = toggleFlightRole(before, field);
      if (field === 'cross_country') { assert.deepEqual(after, before); return; }
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
test('PIC can accompany Dual or CFI; XC stays unavailable until Sim is deselected', () => {
  let values = toggleFlightRole({ pilot_in_command: true }, 'dual');
  assert.equal(values.pilot_in_command, true);
  assert.equal(values.dual, true);
  values = toggleFlightRole(values, 'instructor');
  assert.equal(values.pilot_in_command, true);
  assert.equal(values.dual, false);
  assert.equal(values.instructor, true);
  values = toggleFlightRole(toggleFlightRole(values, 'simulator'), 'cross_country');
  assert.equal(values.simulator, true);
  assert.equal(values.cross_country, false);
  assert.equal(isFlightRoleDisabled(values, 'cross_country'), true);
  values = toggleFlightRole(values, 'simulator');
  assert.equal(isFlightRoleDisabled(values, 'cross_country'), false);
  values = toggleFlightRole(values, 'cross_country');
  assert.equal(values.simulator, false);
  assert.equal(values.cross_country, true);
});

test('one primary flight role is required; optional flags alone do not qualify', async () => {
  const { hasRequiredFlightRole, PRIMARY_FLIGHT_ROLES } = await import('../app/forms/flightRoles.mjs');
  assert.equal(hasRequiredFlightRole({}), false);
  assert.equal(hasRequiredFlightRole({ instructor: true, simulator: true, cross_country: true }), false);
  for (const field of PRIMARY_FLIGHT_ROLES) assert.equal(hasRequiredFlightRole({ [field]: true }), true);
  assert.equal(hasRequiredFlightRole({ pilot_in_command: true, dual: true }), true);
  assert.equal(hasRequiredFlightRole(toggleFlightRole({ solo: true }, 'solo')), false);
});


test('list and detail crew labels reflect recorded roles without assuming PIC', () => {
  assert.equal(flightCrewLabel({simulator: true, dual: true}), 'Dual');
  assert.equal(flightCrewLabel({solo: true}), 'Solo');
  assert.equal(flightCrewLabel({second_in_command: true}), 'SIC');
  assert.equal(flightCrewLabel({pilot_in_command: true, dual: true}), 'PIC Dual');
  assert.equal(flightCrewLabel({}), '');
  assert.equal(flightCrewLabel({is_draft: true, dual: true}), 'Draft');
});


test('Solo selects PIC and keeps PIC when Solo is unchecked', () => {
  const selected = toggleFlightRole({solo:false,pilot_in_command:false}, 'solo');
  assert.equal(selected.pilot_in_command,true);
  assert.equal(selected.solo,true);
  assert.equal(toggleFlightRole(selected, 'solo').pilot_in_command,true);
});
