import { completeReferenceRows } from './referenceRows.mjs';
import { tailnumberScope } from '../storage/tailnumberRecords.mjs';
import api from './axiosConfig';
import { flightStore, flightScope } from '../storage/flights';

export default async function fetchTailnumbers() {
  const scope = await flightScope();
  const response = await api.get('/api/tailnumbers/');
  if (await flightScope() !== scope) return;
  const rows = completeReferenceRows(response.data);
  const store = await flightStore();
  await store.cacheSnapshot(tailnumberScope(scope), rows);
  await store.cacheReference(scope, 'tailnumbers', rows);
}
