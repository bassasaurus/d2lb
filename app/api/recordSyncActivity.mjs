export function createRecordSyncActivity() {
  const active = new Map();
  const outcomes = new Map();
  const listeners = new Set();
  const key = (scope, localId) => JSON.stringify([scope, localId]);
  const notify = (scope, localId) => {
    for (const listener of listeners) {
      try { listener(scope, localId); } catch { /* UI observers cannot interrupt sync. */ }
    }
  };
  return {
    isActive(scope, localId) { return Boolean(scope && localId && active.has(key(scope, localId))); },
    snapshot(scope, localId) { return outcomes.get(key(scope, localId)); },
    subscribe(listener) { listeners.add(listener); return () => listeners.delete(listener); },
    start(scope, localId, operation = {}) {
      const id = key(scope, localId);
      const token = {};
      const running = active.get(id) || new Set();
      running.add(token);
      active.set(id, running);
      const snapshot = { generation: operation.generation, operationId: operation.operation_id, phase: 'sending' };
      outcomes.set(id, snapshot);
      notify(scope, localId);
      return (phase = 'failed') => {
        if (!running.delete(token)) return;
        if (!running.size) active.delete(id);
        if (outcomes.get(id) === snapshot) {
          outcomes.set(id, { ...snapshot, phase, completedAt: Date.now() });
        }
        // Retain recent acknowledgments across screen refreshes without unbounded growth.
        for (const candidate of outcomes.keys()) {
          if (outcomes.size <= 200) break;
          if (!active.has(candidate)) outcomes.delete(candidate);
        }
        notify(scope, localId);
      };
    },
  };
}
export const recordSyncActivity = createRecordSyncActivity();

// A confirmed upload may outrun SQLite-driven screen refreshes. Match the exact
// local edit so an older acknowledgment never hides a newly pending change.
export function recordSyncPresentation(item, activity) {
  const matches = activity && item.sync_generation !== undefined && activity.generation === item.sync_generation;
  if (matches) return {
    sending: activity.phase === 'sending',
    synced: activity.phase === 'synced',
    failed: activity.phase === 'failed',
    completionKey: activity.phase === 'synced' ? activity.operationId : null,
    completedAt: activity.completedAt,
  };
  return { sending: false, synced: (item.sync_state ?? 'synced') === 'synced',
    failed: Boolean(item.sync_error || item.needs_attention), completionKey: null };
}
