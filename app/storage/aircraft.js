import * as Crypto from 'expo-crypto';
import { flightStore, flightScope } from './flights';

// Reuse the durable record/outbox repository in a distinct account namespace.
// Aircraft and flights never share records, UUIDs or cache replacement operations.
export const aircraftScope = scope => `${scope}:aircraft`;
export async function listAircraft() {
  const rows = await (await flightStore()).list(aircraftScope(await flightScope()));
  return rows.sort((a, b) => a.aircraft_type.localeCompare(b.aircraft_type, 'en', { sensitivity: 'base' }));
}
export async function saveAircraft(record) {
  const store = await flightStore();
  const scope = aircraftScope(await flightScope());
  const records = await store.list(scope);
  const code = record.id ? record.aircraft_type : record.aircraft_type.trim().toUpperCase();
  if (records.some(row => row.aircraft_type === code && row.local_id !== record.local_id)) {
    throw new Error('This aircraft type already exists in your account.');
  }
  const localId = record.local_id || (record.id ? `server:${record.id}` : Crypto.randomUUID());
  await store.save(scope, localId, { ...record, aircraft_type: code });
  return { ...record, aircraft_type: code, local_id: localId, sync_state: record.id ? 'pending_update' : 'pending_create' };
}
