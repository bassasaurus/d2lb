import * as Crypto from 'expo-crypto';
import { selectedDefaultType } from './flightDefaults.mjs';
import { flightStore, flightScope } from './flights';

// Reuse the durable record/outbox repository in a distinct account namespace.
// Aircraft and flights never share records, UUIDs or cache replacement operations.
export const aircraftScope = scope => `${scope}:aircraft`;
export async function listAircraft() {
  const rows = await (await flightStore()).list(aircraftScope(await flightScope()));
  const defaultType = selectedDefaultType(rows);
  return rows.filter(row => !row._default_preference).map(row => ({ ...row, is_default: row.aircraft_type === defaultType })).sort((a, b) => a.aircraft_type.localeCompare(b.aircraft_type, 'en', { sensitivity: 'base' }));
}
export async function saveAircraft(record) {
  const store = await flightStore();
  const scope = aircraftScope(await flightScope());
  const records = (await store.list(scope)).filter(row => !row._default_preference);
  const code = record.id ? record.aircraft_type : record.aircraft_type.trim().toUpperCase();
  if (records.some(row => row.aircraft_type === code && row.local_id !== record.local_id)) {
    throw new Error('This aircraft type already exists in your account.');
  }
  const localId = record.local_id || (record.id ? `server:${record.id}` : Crypto.randomUUID());
  await store.save(scope, localId, { ...record, aircraft_type: code });
  return { ...record, aircraft_type: code, local_id: localId, sync_state: record.id ? 'pending_update' : 'pending_create' };
}

export async function saveDefaultAircraft(aircraftType) {
  const scope = aircraftScope(await flightScope());
  const store = await flightStore();
  const records = await store.list(scope);
  if (aircraftType && !records.some(row => !row._default_preference && row.aircraft_type === aircraftType)) {
    throw new Error('Choose an aircraft saved in your account.');
  }
  const existing = records.find(row => row._default_preference);
  await store.save(scope, 'server:-1', { id: -1, revision: 'dfa61a1cc9252b9445b3f8bf6e6f4bf89acbfafba3266a146d8cf1f67fe62d3b',
    ...existing, _default_preference: true, aircraft_type: aircraftType });
}
