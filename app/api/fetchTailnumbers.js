import { tailnumberScope } from '../storage/tailnumberRecords.mjs';
import api from './axiosConfig';
import { flightStore, flightScope } from '../storage/flights';

export default async function fetchTailnumbers() {
  const scope = await flightScope();
  const response = await api.get('/api/tailnumbers/');
  if (await flightScope() !== scope) return;
  if (response.data.next) throw new Error('Tailnumber response was incomplete.');
  const store = await flightStore();
  await store.cacheSnapshot(tailnumberScope(scope), response.data.results);
  await store.cacheReference(scope, 'tailnumbers', response.data.results);
}
