import { FLIGHT_SYNC_LIMIT } from './flightWindow.mjs';

// Transport-independent worker. Persist the immutable operation before sending it.
export async function drainFlightQueue({ store, scope, send, uuid, isCurrent, now = () => Date.now(), label = 'flight' }) {
  let completed = 0;
  for (let count = 0; count < FLIGHT_SYNC_LIMIT; count++) {
    if (!await isCurrent()) throw new Error('Account changed during sync.');
    const operation = await store.nextOperation(scope, uuid(), now());
    if (!operation) return completed;
    try {
      const response = await send(JSON.parse(operation.request));
      await store.acknowledge(scope, operation, response);
      completed++;
    } catch (error) {
      const status = error.response?.status;
      const blocked = [400, 409, 422].includes(status);
      const message = status === 409 ? 'Changed on the website. Review before syncing.'
        : status === 400 || status === 422 ? `Server rejected this ${label}: ${JSON.stringify(error.response?.data || {}).slice(0, 600)}`
        : status === 401 || status === 403 ? 'Sign in again to resume syncing.'
        : 'Upload not confirmed. Saved on device; will retry.';
      await store.failOperation(scope, operation, message, blocked, now());
      if (!blocked) throw error;
    }
  }
  return completed;
}
