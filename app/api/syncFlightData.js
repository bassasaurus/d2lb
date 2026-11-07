import { flightSyncFeedback } from './flightSyncFeedback.mjs';
import { syncTailnumbers } from './syncTailnumbers';
import { tailnumberScope } from '../storage/tailnumbers';
import { session } from '../auth/session';
import * as Crypto from 'expo-crypto';
import AsyncStorage from '@react-native-async-storage/async-storage';
import api from './axiosConfig';
import { flightScope, flightStore, tokenPartition } from '../storage/flights';
import { drainFlightQueue } from './syncEngine.mjs';
import { syncAircraft } from './syncAircraft';
import { aircraftScope } from '../storage/aircraft';

const running = new Map();
async function synchronize() {
  const partition = await tokenPartition();
  const capabilities = (await api.get('/api/mobile/session/')).data;
  if (capabilities.sync_protocol !== 1 || !Number.isInteger(capabilities.account_id)) throw new Error('Server sync upgrade is required.');
  if (await tokenPartition() !== partition) throw new Error('Account changed during sync.');
  const scope = await Crypto.digestStringAsync(Crypto.CryptoDigestAlgorithm.SHA256, `${api.defaults.baseURL}|account:${capabilities.account_id}`);
  const store = await flightStore();
  const previousScope = await flightScope();
  await store.moveScope(previousScope, scope);
  await store.moveScope(aircraftScope(previousScope), aircraftScope(scope));
  await store.moveScope(tailnumberScope(previousScope), tailnumberScope(scope));
  await AsyncStorage.setItem(`flight-scope:${partition}`, scope);
  await syncAircraft(scope, partition, capabilities.aircraft_sync === true, capabilities.default_aircraft_sync === true);
  await syncTailnumbers(scope, partition, capabilities.tailnumber_sync === true);
  await drainFlightQueue({
    store, scope,
    onAcknowledged: ({ scope: account, operation, flight }) => flightSyncFeedback.record(account, operation, flight),
    uuid: () => Crypto.randomUUID(),
    isCurrent: async () => await tokenPartition() === partition,
    send: async data => {
      if (data.data?.validate_airports && capabilities.route_airport_validation !== true) {
        throw new Error('Airport validation requires the server update. Saved locally until then.');
      }
      // Bind the request to the account that owns the queued operation.
      const token = await session.getToken();
      if (await tokenPartition() !== partition) throw new Error('Account changed during sync.');
      const pendingAircraft = await store.list(aircraftScope(scope));
      if (pendingAircraft.some(row => row.aircraft_type === data.data?.aircraft_type && row.sync_state !== 'synced')) {
        throw new Error('Aircraft changes must sync before this flight.');
      }
      const tails = await store.list(tailnumberScope(scope));
      if (tails.some(row => row.registration === data.data?.registration && row.sync_state !== 'synced')) {
        throw new Error('Tailnumber must upload before this flight.');
      }
      return (await api.post('/api/mobile/flight-sync/', data, { pinnedToken: token })).data;
    },
  });
  return scope;
}
export default async function syncFlightData() {
  const partition = await tokenPartition();
  if (!running.has(partition)) {
    running.set(partition, synchronize().finally(() => { running.delete(partition); }));
  }
  return running.get(partition);
}
