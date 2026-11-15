// Notify only after the local transaction commits. Upload failures must never
// turn a durable local save into a reported save failure.
export function createLocalChanges() {
  const listeners = new Set();
  return {
    subscribe(listener) { listeners.add(listener); return () => listeners.delete(listener); },
    notify(scope) {
      for (const listener of listeners) {
        try {
          const pending = listener(scope);
          pending?.catch?.(() => {});
        } catch { /* Sync observers cannot interrupt local persistence. */ }
      }
    },
  };
}
export const localChanges = createLocalChanges();
