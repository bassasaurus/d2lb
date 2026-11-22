export function medicalStageEnd(alert) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(alert?.due_date || '')) return null;
  const due = new Date(`${alert.due_date}T00:00:00Z`);
  if (!Number.isFinite(due.getTime())) return null;
  if (alert.severity === 'success') due.setUTCDate(due.getUTCDate() - 45);
  else if (alert.severity === 'warning') due.setUTCDate(1);
  else return null;
  return due.toISOString().slice(0, 10);
}

export function snoozeUntil(days, now = Date.now()) {
  if (![1, 3, 7, 14, 30].includes(days)) throw new Error('Choose a snooze duration.');
  const date = new Date(now);
  date.setUTCHours(0, 0, 0, 0);
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}
export function medicalDismissed(alert, preference = {}) {
  return alert?.severity === 'warning' && preference.caution_due === alert.due_date;
}
export function medicalUntil(preference = {}, now = Date.now()) {
  const until = Date.parse(`${preference.until}T00:00:00Z`);
  return Number.isFinite(until) && until > now ? until : null;
}
export function medicalVisible(alert, preference = {}, now = Date.now()) {
  return !!alert && alert.severity !== 'success' && !medicalDismissed(alert, preference) && !medicalUntil(preference, now);
}

export function createMedicalPreferences(storage, transport, onChange = () => {}) {
  const writes = new Map(), running = new Map();
  const key = scope => `medical-preferences:${scope}`;
  async function read(scope) {
    try {
      const state = JSON.parse(await storage.getItem(key(scope)));
      if (state && Number.isInteger(state.revision) && state.preference && typeof state.preference === 'object' && !Array.isArray(state.preference)) return state;
    } catch { /* A missing or damaged cache starts with no local preferences. */ }
    return { preference: {}, revision: 0, generation: 0 };
  }
  function update(scope, transform) {
    const next = (writes.get(scope) || Promise.resolve()).catch(() => {}).then(async () => {
      const state = transform(await read(scope));
      await storage.setItem(key(scope), JSON.stringify(state));
      onChange(scope, state);
      return state;
    });
    writes.set(scope, next);
    next.finally(() => { if (writes.get(scope) === next) writes.delete(scope); }).catch(() => {});
    return next;
  }
  async function flush(scope) {
    for (;;) {
      const before = await read(scope);
      const response = await transport(scope, before.pending ? { ...before.preference, generation: before.generation || 0 } : null);
      const after = await update(scope, current => current.revision === before.revision
        ? { ...current, preference: response.preference, generation: response.generation || 0, pending: false } : current);
      if (!after.pending) return after;
    }
  }
  return { read,
    set: (scope, preference) => update(scope, current => ({ ...current, preference, revision: current.revision + 1, pending: true })),
    sync(scope) {
      if (!running.has(scope)) running.set(scope, flush(scope).finally(() => running.delete(scope)));
      return running.get(scope);
    },
  };
}
