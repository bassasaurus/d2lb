// Detect record changes only; flight-time calculations remain entirely on the API.
export async function statsRecordState(store, scope, referenceScopes) {
  const scopes = [scope, ...referenceScopes(scope)];
  const records = [];
  let pending = 0;
  for (let index = 0; index < scopes.length; index++) {
    const namespace = scopes[index];
    pending += await store.pendingCount(namespace);
    const rows = [...await store.list(namespace), ...await store.deletedRecords(namespace)];
    records.push(...rows.map(row => [index, row.local_id || row.id, row.revision || '', row.sync_state || '']));
  }
  records.sort((a, b) => JSON.stringify(a).localeCompare(JSON.stringify(b)));
  return { fingerprint: JSON.stringify(records), pending };
}
export async function refreshStats({ store, scope, referenceScopes, cached, sync, fetchSnapshot, validate,
  isCurrent, onPhase }) {
  const before = await statsRecordState(store, scope, referenceScopes);
  if (!await isCurrent()) return null;
  if (!cached || cached.records_fingerprint !== before.fingerprint || before.pending > 0) {
    onPhase('Syncing logbook changes…');
    scope = await sync();
  }
  if (!await isCurrent()) return null;
  const fetchingState = await statsRecordState(store, scope, referenceScopes);
  onPhase('Updating totals…');
  const snapshot = validate(await fetchSnapshot());
  const after = await statsRecordState(store, scope, referenceScopes);
  if (after.fingerprint !== fetchingState.fingerprint || after.pending !== fetchingState.pending) {
    throw new Error('Records changed while totals were downloading.');
  }
  if (!await isCurrent()) return null;
  const result = { ...snapshot, records_fingerprint: after.fingerprint };
  await store.cacheReference(scope, 'totals-stats', [result]);
  if (!await isCurrent()) return null;
  return { snapshot: result, pending: after.pending };
}
