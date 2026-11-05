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
  const session = (await api.get('/api/mobile/session/')).data;
  if (session.sync_protocol !== 1 || !Number.isInteger(session.account_id)) throw new Error('Server sync upgrade is required.');
  if (await tokenPartition() !== partition) throw new Error('Account changed during sync.');
  const scope = await Crypto.digestStringAsync(Crypto.CryptoDigestAlgorithm.SHA256, `${api.defaults.baseURL}|account:${session.account_id}`);
  const store = await flightStore();
  const previousScope = await flightScope();
  await store.moveScope(previousScope, scope);
  await store.moveScope(aircraftScope(previousScope), aircraftScope(scope));
  await AsyncStorage.setItem(`flight-scope:${partition}`, scope);
  await syncAircraft(scope, partition, session.aircraft_sync === true);
  await drainFlightQueue({
    store, scope,
    uuid: () => Crypto.randomUUID(),
    isCurrent: async () => await tokenPartition() === partition,
    send: async data => {
      // Bind the request to the account that owns the queued operation.
      const token = await AsyncStorage.getItem('token');
      if (await tokenPartition() !== partition) throw new Error('Account changed during sync.');
      const pendingAircraft = await store.list(aircraftScope(scope));
      if (pendingAircraft.some(row => row.aircraft_type === data.data?.aircraft_type && row.sync_state !== 'synced')) {
        throw new Error('Aircraft changes must sync before this flight.');
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
