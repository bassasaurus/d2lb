import { completeReferenceRows } from './referenceRows.mjs';
import { session } from '../auth/session';
import * as Crypto from 'expo-crypto';
import api from './axiosConfig';
import { aircraftScope } from '../storage/aircraft';
import { flightScope, flightStore, tokenPartition } from '../storage/flights';
import { drainFlightQueue } from './syncEngine.mjs';

export async function syncAircraft(scope, partition, enabled, defaultEnabled = false) {
  const store = await flightStore();
  const localScope = aircraftScope(scope);
  if (enabled) {
    await drainFlightQueue({
      store, scope: localScope, label: 'aircraft', operationFilter: 'aircraft-records', uuid: () => Crypto.randomUUID(),
      isCurrent: async () => await tokenPartition() === partition,
      send: async request => {
        const { flight_id, ...operation } = request;
        if (flight_id) operation.record_id = flight_id;
        const token = await session.getToken();
        if (await tokenPartition() !== partition) throw new Error('Account changed during sync.');
        const response = (await api.post('/api/mobile/aircraft-sync/', operation, { pinnedToken: token })).data;
        return { ...response, flight: response.record };
      },
    });
  }
  if (defaultEnabled) {
    await drainFlightQueue({
      store, scope: localScope, label: 'default aircraft', operationFilter: 'aircraft-default',
      uuid: () => Crypto.randomUUID(), isCurrent: async () => await tokenPartition() === partition,
      send: async request => {
        const token = await session.getToken();
        if (await tokenPartition() !== partition) throw new Error('Account changed during sync.');
        const response = (await api.post('/api/mobile/default-aircraft/', request, { pinnedToken: token })).data;
        return { ...response, flight: response.record };
      },
    });
  } else if ((await store.list(localScope)).some(row => row._default_preference && row.sync_state !== 'synced')) {
    throw new Error('Default aircraft sync requires the server update. Your selection is saved on this device.');
  }
  const response = await api.get('/api/aircraft/');
  const records = completeReferenceRows(response.data);
  if (defaultEnabled) {
    const preference = (await api.get('/api/mobile/default-aircraft/')).data;
    if (preference?.id !== -1 || preference._default_preference !== true || typeof preference.revision !== 'string'
      || typeof preference.aircraft_type !== 'string') throw new Error('Invalid default aircraft response.');
    records.push(preference);
  }
  if (await flightScope() !== scope) throw new Error('Account changed during sync.');
  await store.cacheSnapshot(localScope, records);
}
