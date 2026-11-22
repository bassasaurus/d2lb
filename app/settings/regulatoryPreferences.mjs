export function regulatoryKey(row) {
  return row?.preference_key || (row?.kind === 'ipc' ? `ifr:${row.category ?? row.ipc_category ?? ''}` : `regulatory:${row?.id}`);
}
export function regulatoryUntil(days, now = Date.now()) {
  const day = new Date(now);
  day.setUTCHours(0, 0, 0, 0);
  day.setUTCDate(day.getUTCDate() + days);
  return day.toISOString().slice(0, 10);
}
export function regulatoryHidden(preference, row, now = Date.now()) {
  if (!preference || preference.due !== (row?.due_date ?? null)) return false;
  if (preference.severity === 'warning' && row.severity === 'danger') return false;
  return preference.mode === 'until_red' ? row.severity === 'warning'
    : Date.parse(`${preference.until}T00:00:00Z`) > now;
}
export function regulatoryPreference(row, action, days, now = Date.now()) {
  if (action === 'restore') return null;
  const base = { due: row.due_date ?? null, severity: row.severity, title: row.title };
  if (action === 'dismiss' && row.severity === 'warning') return { ...base, mode: 'until_red' };
  if (action !== 'dismiss' && (action !== 'snooze' || ![1, 3, 7, 14].includes(days))) throw new Error('Choose a snooze duration.');
  return { ...base, mode: 'until', until: regulatoryUntil(action === 'dismiss' ? 30 : days, now) };
}
export function createRegulatoryPreferences(storage, transport, onChange = () => {}) {
  const writes = new Map(), running = new Map();
  const key = scope => `regulatory-preferences:${scope}`;
  async function read(scope) {
    try {
      const value = JSON.parse(await storage.getItem(key(scope)));
      if (value && [value.preferences, value.generations, value.pending].every(item => item && typeof item === 'object' && !Array.isArray(item)) && Number.isInteger(value.revision)) return value;
    } catch { /* Use an empty account-scoped cache. */ }
    return { preferences: {}, generations: {}, pending: {}, revision: 0 };
  }
  function update(scope, change) {
    const promise = (writes.get(scope) || Promise.resolve()).catch(() => {}).then(async () => {
      const next = change(await read(scope));
      await storage.setItem(key(scope), JSON.stringify(next));
      onChange(scope, next);
      return next;
    });
    writes.set(scope, promise);
    promise.finally(() => { if (writes.get(scope) === promise) writes.delete(scope); }).catch(() => {});
    return promise;
  }
  async function flush(scope) {
    for (;;) {
      const before = await read(scope);
      const operation = Object.values(before.pending)[0];
      const response = await transport(scope, operation ? operation.payload : null);
      const after = await update(scope, current => {
        const pending = { ...current.pending };
        if (operation && pending[operation.payload.key]?.revision === operation.revision) delete pending[operation.payload.key];
        const preferences = { ...response.preferences };
        for (const item of Object.values(pending)) {
          if (item.preference) preferences[item.payload.key] = item.preference;
          else delete preferences[item.payload.key];
        }
        return { ...current, preferences, generations: response.generations, pending };
      });
      if (!Object.keys(after.pending).length) return after;
    }
  }
  return { read,
    set(scope, row, action, days, now = Date.now()) {
      const preference = regulatoryPreference(row, action, days, now);
      return update(scope, current => {
        const resource = regulatoryKey(row), revision = current.revision + 1;
        const preferences = { ...current.preferences };
        if (preference) preferences[resource] = preference; else delete preferences[resource];
        const payload = { key: resource, action, due: row.due_date ?? null, severity: row.severity,
          generation: row.preference_generation ?? current.generations[resource] ?? 0,
          ...(preference?.until ? { until: preference.until } : {}) };
        return { ...current, preferences, revision, pending: { ...current.pending, [resource]: { payload, preference, revision } } };
      });
    },
    sync(scope) {
      if (!running.has(scope)) running.set(scope, flush(scope).finally(() => running.delete(scope)));
      return running.get(scope);
    },
  };
}
