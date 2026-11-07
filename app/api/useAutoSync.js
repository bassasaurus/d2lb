import { useEffect } from 'react';
import { AppState } from 'react-native';
import NetInfo from '@react-native-community/netinfo';
import { session } from '../auth/session';
import { flightScope, flightStore } from '../storage/flights';
import { aircraftScope } from '../storage/aircraft';
import { tailnumberScope } from '../storage/tailnumberRecords.mjs';
import { logbookPendingCount } from './logbookRefresh.mjs';
import syncFlightData from './syncFlightData';
import { createAutoSync, notifyAutoSync } from './autoSync.mjs';

export default function useAutoSync(auth) {
  useEffect(() => {
    if (!auth.ready || !auth.token) return;
    let foreground = AppState.currentState === 'active';
    const worker = createAutoSync({
      isActive: () => foreground && session.snapshot().version === auth.version,
      hasPending: async () => {
        const scope = await flightScope();
        return await logbookPendingCount(await flightStore(), [scope, aircraftScope(scope), tailnumberScope(scope)]) > 0;
      },
      sync: syncFlightData,
      onStart: () => notifyAutoSync('started'),
      onComplete: () => notifyAutoSync('completed'),
      onError: () => notifyAutoSync('failed'),
    });
    const unsubscribe = NetInfo.addEventListener(state => worker.network(state));
    const check = () => NetInfo.refresh().then(state => worker.network(state, true)).catch(() => {});
    const subscription = AppState.addEventListener('change', state => {
      foreground = state === 'active';
      if (foreground) check();
    });
    const timer = setInterval(() => worker.request(), 30000);
    return () => { unsubscribe(); subscription.remove(); clearInterval(timer); worker.dispose(); };
  }, [auth.ready, auth.token, auth.version]);
}
