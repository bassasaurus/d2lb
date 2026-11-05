import * as Crypto from 'expo-crypto';
import api from './axiosConfig';
import { session } from '../auth/session';
import { flightStore, tokenPartition } from '../storage/flights';
import { aircraftScope } from '../storage/aircraft';
import { tailnumberScope } from '../storage/tailnumbers';
import { drainFlightQueue } from './syncEngine.mjs';
import fetchTailnumbers from './fetchTailnumbers';
export async function syncTailnumbers(scope, partition, enabled) {
  const store = await flightStore();
  if (enabled) await drainFlightQueue({
    store, scope: tailnumberScope(scope), label: 'tailnumber', uuid: () => Crypto.randomUUID(),
    isCurrent: async () => await tokenPartition() === partition,
    send: async operation => {
      const aircraft = await store.list(aircraftScope(scope));
      if (aircraft.some(row => row.aircraft_type === operation.data?.aircraft && row.sync_state !== 'synced')) {
        throw new Error('Aircraft must upload before this tailnumber.');
      }
      const token = await session.getToken();
      if (await tokenPartition() !== partition) throw new Error('Account changed during sync.');
      const response = (await api.post('/api/mobile/tailnumber-sync/', operation, { pinnedToken: token })).data;
      return { ...response, flight: response.record };
    },
  });
  await fetchTailnumbers();
}
