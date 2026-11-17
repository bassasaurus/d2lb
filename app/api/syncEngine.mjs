import { syncErrorResponse } from '../forms/errorFeedback.mjs';
import { FLIGHT_SYNC_LIMIT } from './flightWindow.mjs';
import { recordSyncActivity } from './recordSyncActivity.mjs';

// Transport-independent worker. Persist the immutable operation before sending it.
export async function drainFlightQueue({ store, scope, send, uuid, isCurrent, now = () => Date.now(), label = 'flight', operationFilter, onAcknowledged, onSyncEvent = () => {} }) {
  let completed = 0;
  for (let count = 0; count < FLIGHT_SYNC_LIMIT; count++) {
    if (!await isCurrent()) throw new Error('Account changed during sync.');
    const operation = await store.nextOperation(scope, uuid(), now(), operationFilter);
    if (!operation) return completed;
    const finishActivity = recordSyncActivity.start(scope, operation.local_id, operation);
    let outcome = 'failed';
    let identifiers = {};
    try { identifiers = JSON.parse(operation.request); } catch { /* The normal worker handles invalid queue data below. */ }
    const details = { resource: label, action: identifiers.action, record_id: identifiers.flight_id,
      local_id: operation.local_id, attempt: (operation.attempts || 0) + 1 };
    const observe = (phase, error) => { try { onSyncEvent({ ...details, phase, http_status: error?.response?.status }, error); } catch { /* Non-critical observer. */ } };
    observe('started');
    try {
      const response = await send(JSON.parse(operation.request));
      details.record_id = response.flight?.id ?? details.record_id;
      await store.acknowledge(scope, operation, response);
      outcome = 'synced';
      observe('synced');
      completed++;
      // UI feedback must never turn an acknowledged upload into a failed job.
      try { onAcknowledged?.({ scope, operation, flight: response.flight }); } catch { /* Non-critical observer. */ }
    } catch (error) {
      const status = error.response?.status;
      const blocked = [400, 409, 422].includes(status);
      observe(status === 409 ? 'conflict' : [400, 422].includes(status) ? 'validation' : [401, 403].includes(status) ? 'auth_required' : 'failed', error);
      const message = status === 409 ? 'Changed on website. Review to sync.'
        : status === 400 || status === 422 ? `Check ${label} details.`
        : status === 401 || status === 403 ? 'Sign in again to sync.'
        : 'Not synced. Will retry.';
      await store.failOperation(scope, operation, message, blocked, now(), syncErrorResponse(error.response));
      if (!blocked) throw error;
    } finally {
      finishActivity(outcome);
    }
  }
  return completed;
}
