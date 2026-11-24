import test from 'node:test';
import assert from 'node:assert/strict';
import { DatabaseSync } from 'node:sqlite';
import { createFlightStore } from '../app/storage/flightStore.mjs';
import { adapter } from './helpers/sqlite.mjs';
import { applyAircraftFlightDefaults, toggleAircraftFlightDefault } from '../app/forms/aircraftFlightDefaults.mjs';
import { compareVersions } from '../app/sync/comparison.mjs';

const blank = { aircraft_type:'B737', pilot_in_command:false, second_in_command:false, solo:false, dual:false,
  instructor:false, simulator:false, cross_country:false, date:'11/24/2026', duration:'4.8', route:'SEA-ORD' };

test('PIC and SIC defaults are exclusive, optional and independent of XC', () => {
  let aircraft = toggleAircraftFlightDefault({},'PIC');
  assert.equal(aircraft.default_crew_role,'PIC');
  aircraft=toggleAircraftFlightDefault(aircraft,'SIC');
  assert.equal(aircraft.default_crew_role,'SIC');
  aircraft=toggleAircraftFlightDefault(aircraft,'cross_country');
  assert.equal(aircraft.default_crew_role,'SIC');
  assert.equal(aircraft.default_cross_country,true);
  assert.equal(toggleAircraftFlightDefault(aircraft,'SIC').default_crew_role,'');
});
test('new flights prefill defaults without changing other entered fields', () => {
  const next=applyAircraftFlightDefaults(blank,{default_crew_role:'SIC',default_cross_country:true});
  assert.equal(next.second_in_command,true);assert.equal(next.pilot_in_command,false);assert.equal(next.cross_country,true);
  assert.equal(next.date,blank.date);assert.equal(next.duration,blank.duration);assert.equal(next.route,blank.route);
  const pic=applyAircraftFlightDefaults(next,{default_crew_role:'PIC',default_cross_country:false});
  assert.equal(pic.pilot_in_command,true);assert.equal(pic.second_in_command,false);assert.equal(pic.cross_country,false);
});
test('existing flights retain their selected role and XC, and Sim never receives XC', () => {
  const original={...blank,pilot_in_command:true};
  assert.equal(applyAircraftFlightDefaults(original,{default_crew_role:'SIC',default_cross_country:true},true),original);
  const sim=applyAircraftFlightDefaults({...blank,simulator:true},{default_crew_role:'PIC',default_cross_country:true});
  assert.equal(sim.cross_country,false);
  assert.equal(applyAircraftFlightDefaults(blank,undefined),blank);
});
test('defaults persist offline, survive a downloaded snapshot, and use the normal aircraft outbox', async () => {
  const db=new DatabaseSync(':memory:');
  try {
    const store=await createFlightStore(adapter(db));
    const scope='account:aircraft';
    await store.cacheSnapshot(scope,[{id:5,revision:'original',aircraft_type:'B737'}]);
    const aircraft=(await store.list(scope))[0];
    const changed=toggleAircraftFlightDefault(toggleAircraftFlightDefault(aircraft,'SIC'),'cross_country');
    await store.save(scope,aircraft.local_id,changed);
    await store.cacheSnapshot(scope,[{id:5,revision:'original',aircraft_type:'B737'}]);
    const pending=(await store.list(scope))[0];
    assert.equal(pending.default_crew_role,'SIC');assert.equal(pending.default_cross_country,true);
    const operation=await store.nextOperation(scope,'op-defaults',0,'aircraft-records');
    const request=JSON.parse(operation.request);
    assert.equal(request.action,'update');assert.equal(request.flight_id,5);assert.equal(request.base_revision,'original');
    assert.equal(request.data.default_crew_role,'SIC');assert.equal(request.data.default_cross_country,true);
    const next=applyAircraftFlightDefaults(blank,pending);
    assert.equal(next.second_in_command,true);assert.equal(next.cross_country,true);
    await store.acknowledge(scope,operation,{operation_id:operation.operation_id,flight:{...request.data,id:5,revision:'saved'}});
    assert.equal(await store.pendingCount(scope),0);
    assert.equal((await store.list(scope))[0].default_crew_role,'SIC');
    assert.equal((await store.list(scope))[0].sync_state,'synced');
  } finally {db.close();}
});
test('sync conflict review shows role and XC defaults with neutral legacy values', () => {
  const rows=compareVersions('aircraft',{}, {default_crew_role:'SIC',default_cross_country:true});
  assert.ok(rows.some(row=>row.label==='Default role'));
  assert.ok(rows.some(row=>row.label==='Default XC'));
});
