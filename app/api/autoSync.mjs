export function internetAvailable(state) {
  return state.isConnected === true && state.isInternetReachable === true;
}

export function canAttemptApiSync(state, origin) {
  if (internetAvailable(state)) return true;
  try {
    const url = new URL(origin);
    if (!['http:', 'https:'].includes(url.protocol)) return false;
    const host = url.hostname.toLowerCase();
    if (['localhost', '127.0.0.1', '[::1]', '::1', '10.0.2.2'].includes(host)) return true;
    const parts = host.split('.').map(Number);
    const privateLan = /^\d+\.\d+\.\d+\.\d+$/.test(host) && parts.every(value => value >= 0 && value <= 255)
      && (parts[0] === 10 || (parts[0] === 192 && parts[1] === 168)
        || (parts[0] === 172 && parts[1] >= 16 && parts[1] <= 31));
    return state.isConnected === true && privateLan;
  } catch { return false; }
}

export function createAutoSync({ isActive, hasPending, sync, isOnline = internetAvailable, onStart = () => {}, onComplete = () => {}, onError = () => {} }) {
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
      } catch (error) { if (!disposed && isActive()) onError(error); }
    })().finally(() => {
      running = null;
      if (rerun) { rerun = false; return request(); }
    });
    return running;
  }
  return {
    request,
    network(state, force = false) {
      const next = isOnline(state);
      const reconnected = next && !online;
      online = next;
      return reconnected || force ? request() : Promise.resolve();
    },
    dispose() { disposed = true; rerun = false; },
  };
}

const listeners = new Set();
export function subscribeAutoSync(listener) { listeners.add(listener); return () => listeners.delete(listener); }
export function notifyAutoSync(event, error) {
  for (const listener of listeners) {
    try { listener(event, error); } catch { /* A screen cannot interrupt the sync worker. */ }
  }
}
