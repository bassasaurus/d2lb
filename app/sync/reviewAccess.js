import { tailnumberScope } from '../storage/tailnumberRecords.mjs';
import { session } from '../auth/session';
import api from '../api/axiosConfig';
import { flightStore, flightScope, tokenPartition } from '../storage/flights';
import { aircraftScope } from '../storage/aircraft';

export async function reviewableRecords(store, scope) {
  const groups = await Promise.all([
    ['flight', scope],
    ['aircraft', aircraftScope(scope)],
    ['tailnumber', tailnumberScope(scope)],
  ].map(async ([kind, recordScope]) => (await store.reviewList(recordScope))
    .filter(item => item.can_resolve)
    .map(item => ({ ...item, kind }))));
  return groups.flat();
}

export async function reviewAccess(kind) {
  if (!['flight', 'aircraft', 'tailnumber'].includes(kind)) throw new Error('Unknown record type.');
  const partition = await tokenPartition();
  const base = await flightScope();
  const scope = kind === 'aircraft' ? aircraftScope(base) : kind === 'tailnumber' ? tailnumberScope(base) : base;
  const store = await flightStore();
  const assertCurrent = async () => {
    if (await tokenPartition() !== partition) throw new Error('Account changed. Reopen sync review.');
  };
  return { store, scope, assertCurrent,
    async refresh(localId, generation, id) {
      if (!id) throw new Error('This local record has no server copy yet.');
      const token = await session.getToken();
      await assertCurrent();
      let server;
      try { server = (await api.get(kind === 'aircraft' && localId === 'server:-1' ? '/api/mobile/default-aircraft/' : `/api/${kind === 'aircraft' ? 'aircraft' : kind === 'tailnumber' ? 'tailnumbers' : 'flights'}/${id}/`, { pinnedToken: token })).data; }
      catch (error) {
        if (error.response?.status !== 404) throw error;
        server = null;
      }
      await assertCurrent();
      await store.captureServer(scope, localId, generation, server);
      return store.reviewRecord(scope, localId);
    },
  };
}
