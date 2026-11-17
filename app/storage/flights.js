import { monitoring } from '../monitoring';
import { monitoredStorage } from '../monitoring/core.mjs';
import { session } from '../auth/session';
import * as SQLite from 'expo-sqlite';
import * as Crypto from 'expo-crypto';
import AsyncStorage from '@react-native-async-storage/async-storage';
import api from '../api/axiosConfig';
import { createFlightStore } from './flightStore.mjs';
import { downloadFlightWindow } from '../api/flightWindow.mjs';

let storePromise;
export function flightStore() {
  if (!storePromise) {
    storePromise = SQLite.openDatabaseAsync('logbook-offline.db').then(db => createFlightStore(monitoredStorage(db, monitoring.report))).catch(error => {
      monitoring.report(error, { resource: 'database', action: 'open' });
      storePromise = undefined;
      throw error;
    });
  }
  return storePromise;
}

export async function tokenPartition() {
  const token = await session.getToken();
  if (!token) throw new Error('Sign in before accessing local flights.');
  // Never store the credential itself in the database. A rotated token uses a
  // separate partition until a stable server account identifier is introduced.
  return Crypto.digestStringAsync(Crypto.CryptoDigestAlgorithm.SHA256, `${api.defaults.baseURL}|${token}`);
}

export async function flightScope() {
  const partition = await tokenPartition();
  return await AsyncStorage.getItem(`flight-scope:${partition}`) || partition;
}

export async function saveLocalFlight(flight) {
  const scope = await flightScope();
  const localId = flight.local_id || (flight.id ? `server:${flight.id}` : Crypto.randomUUID());
  const store = await flightStore();
  const sync_generation = await store.save(scope, localId, flight);
  monitoring.breadcrumb({ resource: 'flight', action: flight.id ? 'update' : 'create', phase: 'saved', record_id: flight.id, local_id: localId });
  return { ...flight, sync_generation, local_id: localId, sync_state: flight.id ? 'pending_update' : 'pending_create' };
}

export async function refreshFlightCache(scope) {
  const flights = await downloadFlightWindow({
    origin: api.defaults.baseURL,
    getPage: async url => (await api.get(url)).data,
    isCurrent: async () => await flightScope() === scope,
  });
  const store = await flightStore();
  await store.cacheSnapshot(scope, flights);
  await store.cacheReference(scope, 'flight-window-sync', [{ downloaded_at: new Date().toISOString() }]);
}
