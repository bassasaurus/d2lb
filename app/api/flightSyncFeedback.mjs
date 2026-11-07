// Only acknowledge records that were pending locally and are now server-confirmed.
export function completedFlightSyncs(before, after) {
  const pending = before.filter(row => row.sync_state !== 'synced' && row.sync_state !== 'pending_delete');
  return after.filter(row => row.sync_state === 'synced' && pending.some(old =>
    old.local_id === row.local_id || (old.id != null && old.id === row.id))).map(row => row.local_id);
}

// Reconnect may finish uploading from another screen before Logbook reads its
// first snapshot. Keep acknowledgements until that account's list can show them.
export function createFlightSyncFeedback(now = () => Date.now()) {
  const accounts = new Map();
  return {
    record(scope, operation, flight) {
      if (!flight?.id) return;
      const events = accounts.get(scope) || new Map();
      events.set(operation.local_id, { id: flight.id, at: now() });
      while (events.size > 200) events.delete(events.keys().next().value);
      accounts.set(scope, events);
    },
    take(scope, rows) {
      const events = accounts.get(scope);
      if (!events) return [];
      const completed = [];
      for (const [key, event] of events) {
        if (now() - event.at > 600000) { events.delete(key); continue; }
        const row = rows.find(item => item.sync_state === 'synced' && (item.local_id === key || item.id === event.id));
        if (row) { completed.push(row.local_id); events.delete(key); }
      }
      if (!events.size) accounts.delete(scope);
      return completed;
    },
  };
}
export const flightSyncFeedback = createFlightSyncFeedback();
