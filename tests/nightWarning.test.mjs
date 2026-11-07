import test from 'node:test';
import assert from 'node:assert/strict';
import { nightPairWarnings } from '../app/forms/nightWarning.mjs';

test('warns when night landings are entered without night time', () => {
  assert.ok(nightPairWarnings({ night: '', landings_night: '2' }).night);
  assert.ok(nightPairWarnings({ night: '0', landings_night: 1 }).night);
});
test('no warning for night time without landings or when both are entered', () => {
  for (const values of [{}, { night: '', landings_night: '' }, { night: 0, landings_night: 0 },
    { night: '1.5', landings_night: '' }, { night: 1, landings_night: 0 },
    { night: '2.3', landings_night: '1' }, { night: 'invalid', landings_night: '' }]) {
    assert.deepEqual(nightPairWarnings(values), {});
  }
});
