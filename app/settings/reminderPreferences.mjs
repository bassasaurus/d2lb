import { parseSnoozes } from './reminderSnoozes.mjs';

export function createReminderPreferences(storage, onChange = () => {}) {
  const writes = new Map();
  return {
    update(scope, update, source) {
      const key = `reminder-snoozes:${scope}`;
      const previous = writes.get(key) || Promise.resolve();
      const pending = previous.catch(() => {}).then(async () => {
        const saved = parseSnoozes(await storage.getItem(key));
        const next = update(saved);
        await storage.setItem(key, JSON.stringify(next));
        onChange({ type: 'preferences', scope, saved: next, source });
        return next;
      });
      writes.set(key, pending);
      pending.finally(() => { if (writes.get(key) === pending) writes.delete(key); }).catch(() => {});
      return pending;
    },
  };
}
