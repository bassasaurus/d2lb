export function fingerprint(value) {
  if (Array.isArray(value)) return `[${value.map(fingerprint).join(',')}]`;
  if (value && typeof value === 'object') return `{${Object.keys(value).sort().map(key => `${JSON.stringify(key)}:${fingerprint(value[key])}`).join(',')}}`;
  return JSON.stringify(value);
}
export function draftKey(scope, kind, record) {
  if (!scope || !['flight', 'aircraft', 'tailnumber', 'profile-account', 'profile-medical', 'profile-signature'].includes(kind)) throw new Error('Unknown draft account or form.');
  return `form-draft:v1:${encodeURIComponent(scope)}:${kind}:${encodeURIComponent(record)}`;
}
export function createDraftStore(storage, now = () => new Date().toISOString()) {
  // All writes/removals are ordered, so a slow autosave cannot recreate a discarded draft.
  let queue = Promise.resolve();
  function serial(work) {
    const result = queue.then(work);
    queue = result.catch(() => {});
    return result;
  }
  return {
    load(key) { return serial(async () => {
      const raw = await storage.getItem(key);
      if (!raw) return null;
      const draft = JSON.parse(raw);
      if (draft.version !== 1 || typeof draft.baseline !== 'string' || !draft.values || Array.isArray(draft.values)
          || typeof draft.values !== 'object' || !Number.isFinite(Date.parse(draft.updatedAt))) {
        throw new Error('Saved draft could not be read.');
      }
      return draft;
    }); },
    save(key, baseline, values) {
      // Snapshot synchronously: later Formik changes must not mutate an already queued write.
      const draft = { version: 1, baseline: fingerprint(baseline), values: JSON.parse(JSON.stringify(values)), updatedAt: now() };
      return serial(async () => { await storage.setItem(key, JSON.stringify(draft)); return draft; });
    },
    remove(key) { return serial(() => storage.removeItem(key)); },
  };
}
