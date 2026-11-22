export function createReminderCache(storage, onChange = () => {}) {
  const key = (scope, kind) => `reminder-cache:${scope}:${kind}`;
  return {
    async read(scope, kind) {
      try {
        const saved = JSON.parse(await storage.getItem(key(scope, kind)));
        return saved && Array.isArray(saved.data?.reminders) && Number.isFinite(saved.updatedAt) ? saved : null;
      } catch { return null; }
    },
    async write(scope, kind, data, updatedAt = Date.now(), source) {
      if (!Array.isArray(data?.reminders)) throw new Error('Invalid reminder response');
      const saved = { data, updatedAt };
      await storage.setItem(key(scope, kind), JSON.stringify(saved));
      onChange({ type: 'data', scope, kind, snapshot: saved, source });
      return saved;
    },
    async remove(scope, id) {
      for (const kind of ['alerts', 'manage']) {
        const saved = await this.read(scope, kind);
        if (saved) await this.write(scope, kind, {
          ...saved.data, reminders: saved.data.reminders.filter(row => row.id !== id),
        }, saved.updatedAt);
      }
    },
    async invalidate(scope) {
      for (const kind of ['alerts', 'manage']) {
        try {
          const saved = JSON.parse(await storage.getItem(key(scope, kind)));
          if (saved?.data) await storage.setItem(key(scope, kind), JSON.stringify({ ...saved, invalidated: true }));
        } catch { /* A missing or damaged snapshot will be downloaded again. */ }
      }
    },
  };
}
