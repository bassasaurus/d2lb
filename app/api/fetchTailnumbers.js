import api from './axiosConfig';
import { flightStore, flightScope } from '../storage/flights';

export default async function fetchTailnumbers() {
  const scope = await flightScope();
  const response = await api.get('/api/tailnumbers/');
  if (await flightScope() !== scope) return;
  await (await flightStore()).cacheReference(scope, 'tailnumbers', response.data.results);
}
