import test from 'node:test';
import assert from 'node:assert/strict';
import { nightLandingErrors } from '../app/forms/nightLandings.mjs';
test('Full Stop needs a night landing count and night time', () => {
  assert.equal(nightLandingErrors({duration:'2',night_landings_full_stop:true}).night,'Night time required for Full Stop.');
  assert.equal(nightLandingErrors({duration:'2',night_landings_full_stop:true,night:'.1'}).night_landings_full_stop,'Enter Night landings.');
  assert.deepEqual(nightLandingErrors({duration:'2',night_landings_full_stop:true,night:'.1',landings_night:1}),{});
  assert.deepEqual(nightLandingErrors({duration:'2',landings_night:1}),{});
});
