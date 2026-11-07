import { FLIGHT_SYNC_LIMIT } from './flightWindow.mjs';

// Transport-independent worker. Persist the immutable operation before sending it.
export async function drainFlightQueue({ store, scope, send, uuid, isCurrent, now = () => Date.now(), label = 'flight', operationFilter, onAcknowledged }) {
  let completed = 0;
  for (let count = 0; count < FLIGHT_SYNC_LIMIT; count++) {
    if (!await isCurrent()) throw new Error('Account changed during sync.');
    const operation = await store.nextOperation(scope, uuid(), now(), operationFilter);
    if (!operation) return completed;
    try {
      const response = await send(JSON.parse(operation.request));
      await store.acknowledge(scope, operation, response);
      completed++;
      // UI feedback must never turn an acknowledged upload into a failed job.
      try { onAcknowledged?.({ scope, operation, flight: response.flight }); } catch { /* Non-critical observer. */ }
    } catch (error) {
      const status = error.response?.status;
      const blocked = [400, 409, 422].includes(status);
      const message = status === 409 ? 'Changed on website. Review to sync.'
        : status === 400 || status === 422 ? `Check ${label} details.`
        : status === 401 || status === 403 ? 'Sign in again to sync.'
        : 'Not synced. Will retry.';
      await store.failOperation(scope, operation, message, blocked, now(), error.response ? { ...(error.response.data || {}), _http_status: status } : null);
      if (!blocked) throw error;
    }
  }
  return completed;
}
