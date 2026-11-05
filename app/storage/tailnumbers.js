import * as Crypto from 'expo-crypto';
import { flightScope, flightStore } from './flights';
import { aircraftScope } from './aircraft';
import { mergeTailnumbers, prepareLocalTailnumber, tailnumberScope } from './tailnumberRecords.mjs';
export { tailnumberScope } from './tailnumberRecords.mjs';
export async function listTailnumbers(scope) {
  scope = scope || await flightScope();
  const store = await flightStore();
  return mergeTailnumbers(await store.reference(scope, 'tailnumbers'), await store.list(tailnumberScope(scope)));
}
export async function saveLocalTailnumber(values) {
  const scope = await flightScope();
  const store = await flightStore();
  const rows = await listTailnumbers(scope);
  const [flights, aircraft, references] = await Promise.all([
    store.list(scope), store.list(aircraftScope(scope)), store.reference(scope, 'tailnumbers'),
  ]);
  const prepared = prepareLocalTailnumber(values, rows, flights, aircraft, references);
  const local_id = values.local_id || Crypto.randomUUID();
  const record = { ...prepared, local_id };
  await store.save(tailnumberScope(scope), local_id, record, { unattemptedCreateOnly: true });
  return { ...record, sync_state: 'pending_create' };
}
