// Reminder screens stay mounted in the drawer, so changes must reach them
// without relying solely on a navigation focus or an app restart.
export function createReminderEvents() {
  const listeners = new Set();
  return {
    subscribe(listener) {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    publish(event) {
      for (const listener of listeners) {
        try { Promise.resolve(listener(event)).catch(() => {}); }
        catch { /* A screen listener must not turn a saved change into a failure. */ }
      }
    },
  };
}
export const reminderEvents = createReminderEvents();
