import { session } from '../auth/session';
import * as Crypto from 'expo-crypto';
import api from './axiosConfig';
import { aircraftScope } from '../storage/aircraft';
import { flightScope, flightStore, tokenPartition } from '../storage/flights';
import { drainFlightQueue } from './syncEngine.mjs';

export async function syncAircraft(scope, partition, enabled) {
  const store = await flightStore();
  const localScope = aircraftScope(scope);
  if (enabled) {
    await drainFlightQueue({
      store, scope: localScope, label: 'aircraft', uuid: () => Crypto.randomUUID(),
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
  const response = await api.get('/api/aircraft/');
  if (await flightScope() !== scope) throw new Error('Account changed during sync.');
  if (response.data.next) throw new Error('Aircraft response was incomplete.');
  await store.cacheSnapshot(localScope, response.data.results);
}
