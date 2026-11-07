import test from 'node:test';
import assert from 'node:assert/strict';
import { hasRequiredSoloLandings } from '../app/forms/landingRequirements.mjs';

test('Solo requires a positive whole-number landing count in either Day or Night', () => {
  for (const values of [{}, { landings_day: '', landings_night: '' }, { landings_day: '0', landings_night: 0 },
    { landings_day: '-1' }, { landings_night: 'invalid' }, { landings_day: '1.5' }]) {
    assert.equal(hasRequiredSoloLandings({ ...values, solo: true }), false);
  }
  for (const values of [{ landings_day: 1 }, { landings_night: '1' }, { landings_day: '2', landings_night: '3' }]) {
    assert.equal(hasRequiredSoloLandings({ ...values, solo: true }), true);
  }
});
test('unchecking Solo removes its landing requirement without changing entered counts', () => {
  const values = { solo: false, landings_day: '', landings_night: '' };
  assert.equal(hasRequiredSoloLandings(values), true);
  assert.deepEqual(values, { solo: false, landings_day: '', landings_night: '' });
});
