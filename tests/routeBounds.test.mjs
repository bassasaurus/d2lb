import test from 'node:test';
import assert from 'node:assert/strict';
import { routeFitCoordinates, routeMapPadding } from '../app/maps/routeBounds.mjs';
test('fitting includes all legs, markers and the interior of long geodesic routes', () => {
  const start = { latitude: 40, longitude: -120 }, end = { latitude: 40, longitude: -60 };
  const marker = { latitude: 45, longitude: -90 };
  const points = routeFitCoordinates([start, end], [{ coordinates: marker }]);
  assert.ok(points.some(point => point.latitude > 43));
  assert.ok(points.includes(start) && points.includes(end) && points.includes(marker));
});
test('single airports, repeated endpoints and invalid coordinates remain safe', () => {
  const airport = { latitude: 30, longitude: -95 };
  assert.deepEqual(routeFitCoordinates([airport, airport]), [airport]);
  assert.deepEqual(routeFitCoordinates([{ latitude: NaN, longitude: 0 }], [{ coordinates: airport }]), [airport]);
  assert.deepEqual(routeFitCoordinates([{ latitude: 95, longitude: 0 }]), []);
});
test('dateline crossings and opposite points never yield invalid map coordinates', () => {
  for (const ends of [[{ latitude: 30, longitude: 170 }, { latitude: 30, longitude: -170 }],
    [{ latitude: 0, longitude: 0 }, { latitude: 0, longitude: 180 }]]) {
    for (const point of routeFitCoordinates(ends)) {
      assert.ok(Number.isFinite(point.latitude) && Math.abs(point.latitude) <= 90);
      assert.ok(Number.isFinite(point.longitude) && Math.abs(point.longitude) <= 180);
    }
  }
});
test('padding fits the actual viewport instead of reserving hundreds of pixels', () => {
  const padding = routeMapPadding(360, 250);
  assert.ok(padding.left > 0 && padding.top + padding.bottom < 100);
  assert.ok(routeMapPadding(280, 120).top + routeMapPadding(280, 120).bottom < 60);
});
