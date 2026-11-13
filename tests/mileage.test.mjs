import test from 'node:test';
import assert from 'node:assert/strict';
import { formatMileage } from '../app/maps/mileage.mjs';

test('mileage defaults to nautical miles with thousands separators', () => {
  assert.equal(formatMileage(12345.6), '12,345.6 NM');
  assert.equal(formatMileage(0), '0.0 NM');
});
test('mileage converts only the display from the API nautical miles', () => {
  assert.equal(formatMileage(1000, 'mi'), '1,150.8 mi');
  assert.equal(formatMileage(1000, 'km'), '1,852.0 km');
  assert.equal(formatMileage(1000, 'invalid'), '1,000.0 NM');
});
test('missing and invalid mileage is never shown as zero', () => {
  for (const value of [null, undefined, NaN, Infinity]) assert.equal(formatMileage(value), 'Mileage unavailable');
});
