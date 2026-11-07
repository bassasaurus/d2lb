export function internetAvailable(state) {
  return state.isConnected === true && state.isInternetReachable === true;
}

export function createAutoSync({ isActive, hasPending, sync, onStart = () => {}, onComplete = () => {}, onError = () => {} }) {
  let online = false;
  let disposed = false;
  let running = null;
  let rerun = false;
  function request() {
    if (disposed || !online || !isActive()) return Promise.resolve();
    if (running) { rerun = true; return running; }
    running = (async () => {
      try {
        if (!await hasPending() || disposed || !online || !isActive()) return;
        onStart();
        await sync();
        if (!disposed && isActive()) onComplete();
      } catch { if (!disposed && isActive()) onError(); }
    })().finally(() => {
      running = null;
      if (rerun) { rerun = false; return request(); }
    });
    return running;
  }
  return {
    request,
    network(state, force = false) {
      const next = internetAvailable(state);
      const reconnected = next && !online;
      online = next;
      return reconnected || force ? request() : Promise.resolve();
    },
    dispose() { disposed = true; rerun = false; },
  };
}

const listeners = new Set();
export function subscribeAutoSync(listener) { listeners.add(listener); return () => listeners.delete(listener); }
export function notifyAutoSync(event) {
  for (const listener of listeners) {
    try { listener(event); } catch { /* A screen cannot interrupt the sync worker. */ }
  }
}
