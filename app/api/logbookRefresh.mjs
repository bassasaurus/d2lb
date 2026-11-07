export function shouldRefreshLogbook({ force = false, pending = 0, hasSnapshot = false }) {
  return force || pending > 0 || !hasSnapshot;
}
export async function logbookPendingCount(store, scopes) {
  const counts = await Promise.all(scopes.map(scope => store.pendingCount(scope)));
  return counts.reduce((sum, count) => sum + count, 0);
}
