import test from 'node:test';
import assert from 'node:assert/strict';
import {isGliderFlight, launchChoices, launchMethodErrors, prepareLaunchEntry, changeFlightAircraft} from '../app/forms/launchMethods.mjs';
const glider = {aircraft_type: 'ASK21', aircraft_category: 'GL', self_launch_capable: false};
test('all real glider flights require launch method on create and edit', () => {
  const flight = {id: 123, aircraft_type: 'ASK21', simulator: false, launch_method: ''};
  assert.equal(isGliderFlight(flight, glider), true);
  assert.equal(launchMethodErrors(flight, glider).launch_method, 'Choose a launch method.');
  for (const launch_method of ['AEROTOW', 'GROUND']) {
    assert.deepEqual(launchMethodErrors({...flight, launch_method}, glider), {});
  }
  assert.ok(launchMethodErrors({...flight, launch_method: 'OTHER'}, glider).launch_method);
});
test('Self-launch requires aircraft capability and changing aircraft clears an unavailable selection', () => {
  const flight = {aircraft_type: 'GL2', launch_method: 'SELF'};
  assert.deepEqual(launchChoices(glider).map(x => x[0]), ['AEROTOW', 'GROUND']);
  assert.ok(launchMethodErrors(flight, glider).launch_method);
  assert.deepEqual(launchMethodErrors(flight, {...glider, self_launch_capable: true}), {});
  assert.equal(launchChoices({...glider, self_launch_capable: true}).length, 3);
  assert.equal(changeFlightAircraft(flight, 'ASK21', glider).launch_method, '');
  assert.equal(changeFlightAircraft({...flight, launch_method: 'GROUND'}, 'ASK21', glider).launch_method, 'GROUND');
});
test('other categories and simulator sessions have no launch requirement and clear stale metadata', () => {
  const aircraft = {aircraft_category: 'A'};
  assert.deepEqual(launchMethodErrors({}, aircraft), {});
  assert.deepEqual(launchMethodErrors({simulator: true}, glider), {});
  assert.equal(prepareLaunchEntry({launch_method: 'GROUND'}, aircraft).launch_method, '');
  assert.equal(prepareLaunchEntry({simulator: true, launch_method: 'GROUND'}, glider).launch_method, '');
});
test('offline launch method survives reopening, acknowledgment and refresh', async () => {
  const {DatabaseSync} = await import('node:sqlite');
  const {adapter} = await import('./helpers/sqlite.mjs');
  const {createFlightStore} = await import('../app/storage/flightStore.mjs');
  const db = new DatabaseSync(':memory:');
  try {
    let store = await createFlightStore(adapter(db));
    const flight = {aircraft_type: 'ASK21', registration: 'N1234', date: '2026-11-24', duration: '1.2', launch_method: 'GROUND'};
    await store.save('owner', 'local-glider', prepareLaunchEntry(flight, glider));
    store = await createFlightStore(adapter(db));
    assert.equal((await store.list('owner'))[0].launch_method, 'GROUND');
    const operation = await store.nextOperation('owner', 'launch-op');
    const payload = JSON.parse(operation.request).data;
    assert.equal(payload.launch_method, 'GROUND');
    const saved = {...payload, id: 52, revision: 'r52'};
    await store.acknowledge('owner', operation, {operation_id: operation.operation_id, flight: saved});
    await store.cacheSnapshot('owner', [saved]);
    assert.equal((await store.list('owner'))[0].launch_method, 'GROUND');
    assert.equal(await store.pendingCount('owner'), 0);
  } finally {db.close();}
});
