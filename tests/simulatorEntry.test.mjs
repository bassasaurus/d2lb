import test from 'node:test';
import assert from 'node:assert/strict';
import { simulatorEntryErrors, prepareFlightEntry, sessionIdentifier } from '../app/forms/simulatorEntry.mjs';

test('new simulator sessions require a supported device type and identifier', () => {
  assert.deepEqual(simulatorEntryErrors({ simulator: true }), {
    device_type: 'Select device type.',
  });
  for (const device_type of ['FFS', 'FTD', 'ATD']) {
    assert.deepEqual(simulatorEntryErrors({ simulator: true, device_type, device_id: 'Training center 42', ...(device_type === 'ATD' ? { atd_type: 'AATD' } : {}) }), {});
  }
  assert.ok(simulatorEntryErrors({ simulator: true, device_type: 'FFS', device_id: '  ' }).device_id);
  assert.ok(simulatorEntryErrors({ simulator: true, device_type: 'SIM', device_id: 'abc' }).device_type);
});

test('editing legacy simulator sessions requires classification without inventing it', () => {
  const legacy = { id: 14, simulator: true, aircraft_type: '737', registration: 'OLD', duration: '4.0' };
  assert.ok(simulatorEntryErrors({ ...legacy, remarks: 'Updated' }, legacy).device_type);
  assert.ok(simulatorEntryErrors({ ...legacy, device_type: 'FFS' }, legacy).device_id);
  assert.ok(simulatorEntryErrors({ simulator: true }, { id: 14, simulator: false }).device_type);
  assert.ok(simulatorEntryErrors({ simulator: true }, { id: 14, simulator: true, device_type: 'FFS', device_id: 'abc' }).device_type);
});

test('ordinary flight entries keep tailnumbers and do not send stale simulator metadata', () => {
  const prepared = prepareFlightEntry({ simulator: false, registration: 'N12345', route: 'SEA-ORD', device_type: 'FFS', device_id: 'old' });
  assert.equal(prepared.registration, 'N12345');
  assert.equal(prepared.route, 'SEA-ORD');
  assert.equal(prepared.device_type, '');
  assert.equal(prepared.device_id, '');
  assert.deepEqual(simulatorEntryErrors(prepared), {});
});

test('preparing simulator data preserves represented aircraft and duration offline', () => {
  const values = { simulator: true, aircraft_type: '737', device_type: 'FFS', device_id: '  737-42  ', duration: '4.0', route: '', registration: '' };
  const result = prepareFlightEntry(values);
  assert.equal(result.aircraft_type, '737');
  assert.equal(result.device_id, '737-42');
  assert.equal(result.duration, '4.0');
  assert.equal(result.route, '');
  assert.equal(values.device_id, '  737-42  ');
});

test('session labels distinguish simulator identity from a real tailnumber', () => {
  assert.equal(sessionIdentifier({ simulator: true, device_type: 'FFS', device_id: '737-42', registration: 'N123' }), 'FFS 737-42');
  assert.equal(sessionIdentifier({ simulator: true, registration: 'LEGACY' }), 'Sim');
  assert.equal(sessionIdentifier({ simulator: false, registration: 'N123' }), 'N123');
});

test('legacy simulator sessions retain their data but require classification when edited', () => {
  const legacy = { id: 42, simulator: true, aircraft_type: 'B737', registration: 'OLD-SIM', duration: '4.0' };
  assert.ok(simulatorEntryErrors({ ...legacy, remarks: 'Corrected' }, legacy).device_type);
  assert.ok(simulatorEntryErrors({ ...legacy, device_type: 'FFS' }, legacy).device_id);
  assert.equal(prepareFlightEntry(legacy).duration, '4.0');
  assert.equal(sessionIdentifier(legacy), 'Sim');
  assert.equal(sessionIdentifier({ simulator: true, device_type: 'FFS', device_id: 'S42' }), 'FFS S42');
  assert.equal(sessionIdentifier({ registration: 'N1234' }), 'N1234');
});

test('device metadata stays queued offline and survives acknowledgment and refresh', async () => {
  const { DatabaseSync } = await import('node:sqlite');
  const { adapter } = await import('./helpers/sqlite.mjs');
  const { createFlightStore } = await import('../app/storage/flightStore.mjs');
  const db = new DatabaseSync(':memory:');
  try {
    const store = await createFlightStore(adapter(db));
    const entry = prepareFlightEntry({ simulator: true, aircraft_type: 'B737',
      device_type: 'FTD', device_id: ' S42 ', registration: '', route: '', duration: '3.5' });
    await store.save('owner', 'local-device', entry);
    assert.equal(await store.pendingCount('owner'), 1);
    assert.equal((await store.list('owner'))[0].device_id, 'S42');
    const operation = await store.nextOperation('owner', 'op-device');
    const payload = JSON.parse(operation.request).data;
    assert.equal(payload.device_type, 'FTD');
    assert.equal(payload.aircraft_type, 'B737');
    const flight = { ...payload, id: 12, revision: 'revision-12', registration: null };
    await store.acknowledge('owner', operation, { operation_id: operation.operation_id, flight });
    await store.cacheSnapshot('owner', [flight]);
    const saved = (await store.list('owner'))[0];
    assert.equal(saved.device_id, 'S42');
    assert.equal(saved.sync_state, 'synced');
    assert.equal(await store.pendingCount('owner'), 0);
  } finally { db.close(); }
});

test('instrument-rating estimates require ATD classification, instruction and an instrument portion', () => {
  const entry = { simulator: true, device_type: 'ATD', device_id: 'A1', duration: '2.0', instrument_credit_eligible: true };
  const errors = simulatorEntryErrors(entry);
  assert.ok(errors.atd_type);
  assert.equal(errors.dual, undefined);
  assert.equal(errors.simulated_instrument, undefined);
  assert.ok(simulatorEntryErrors({ ...entry, atd_type: 'AATD' }).dual);
  assert.ok(simulatorEntryErrors({ ...entry, atd_type: 'AATD', dual: true }).simulated_instrument);
  assert.deepEqual(simulatorEntryErrors({ ...entry, atd_type: 'AATD', dual: true, simulated_instrument: '1.5' }), {});
  assert.ok(simulatorEntryErrors({ ...entry, atd_type: 'AATD', dual: true, simulated_instrument: '3.0' }).simulated_instrument);
  const prepared = prepareFlightEntry({ ...entry, atd_type: 'BATD', device_type: 'FFS' });
  assert.equal(prepared.atd_type, '');
  assert.equal(prepareFlightEntry({ ...entry, simulator: false }).instrument_credit_eligible, false);
});

test('ATD classification is required even when instrument credit is not selected', () => {
  const entry = { simulator: true, device_type: 'ATD', device_id: 'A42' };
  assert.ok(simulatorEntryErrors(entry).atd_type);
  for (const atd_type of ['BATD', 'AATD']) assert.deepEqual(simulatorEntryErrors({ ...entry, atd_type }), {});
});

test('simulator validation progresses through prerequisites without cascading errors', () => {
  let entry = { simulator: true, instrument_credit_eligible: true };
  const stages = [
    ['device_type', { device_type: 'ATD' }], ['atd_type', { atd_type: 'BATD' }],
    ['device_id', { device_id: 'B42' }], ['dual', { dual: true }],
    ['duration', { duration: '2.0' }], ['simulated_instrument', { simulated_instrument: '1.0' }],
  ];
  for (const [field, update] of stages) {
    assert.deepEqual(Object.keys(simulatorEntryErrors(entry)), [field]);
    entry = { ...entry, ...update };
  }
  assert.deepEqual(simulatorEntryErrors(entry), {});
  assert.deepEqual(simulatorEntryErrors({ ...entry, instrument_credit_eligible: false, dual: false, simulated_instrument: '' }), {});
  assert.ok(simulatorEntryErrors({ ...entry, instrument_credit_eligible: false, simulated_instrument: '3.0' }).simulated_instrument);
  assert.deepEqual(simulatorEntryErrors({ ...entry, simulator: false }), {});
});

test('saving a simulator session clears stale XC from older records or drafts', () => {
  const values = { simulator: true, cross_country: true, device_type: 'FFS', device_id: 'F42' };
  assert.equal(prepareFlightEntry(values).cross_country, false);
  assert.equal(values.cross_country, true);
  assert.equal(prepareFlightEntry({ simulator: false, cross_country: true }).cross_country, true);
});


test('training programs are optional, validated, preserved offline, and cleared for aircraft flights', () => {
  const session = { simulator: true, device_type: 'FFS', device_id: 'SIM-1', duration: '2.0' };
  for (const training_program of ['', '141', '142']) {
    assert.deepEqual(simulatorEntryErrors({ ...session, training_program }), {});
    assert.equal(prepareFlightEntry({ ...session, training_program }).training_program, training_program);
  }
  assert.ok(simulatorEntryErrors({ ...session, training_program: '999' }).training_program);
  assert.equal(prepareFlightEntry({ ...session, simulator: false, training_program: '141' }).training_program, '');
  assert.equal(prepareFlightEntry(session).training_program, '');
});
