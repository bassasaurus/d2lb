export const normalizeRoute = value => String(value || '').toUpperCase().replace(/\s/g, '-');
export const routeCodes = route => normalizeRoute(route).split(/[^A-Z0-9]+/).filter(Boolean);
export function applyAirportChoices(route, entries, choices) {
  return entries.map(entry => {
    const selected = choices?.route === route && entry.candidates?.find(airport => airport.id === choices.airports?.[String(entry.position)]);
    return selected ? { ...entry, status: 'recognized', airport: selected } : entry;
  });
}
export function routeErrors(entries) {
  return entries.filter(entry => ['unknown', 'ambiguous'].includes(entry.status)).map(entry =>
    `${entry.code}: ${entry.status === 'unknown' ? 'airport not found.' : 'choose which airport you mean.'}`);
}
export function createAirportChecker({ get, storage, now = () => Date.now() }) {
  const ttl = 24 * 60 * 60 * 1000;
  return async (route, scope) => {
    const codes = routeCodes(route);
    const key = code => `airport-check:v1:${encodeURIComponent(scope)}:${code}`;
    try {
      const response = await get(route);
      const entries = response.entries;
      if (!Array.isArray(entries) || entries.length !== codes.length || entries.some((entry, index) => entry.code !== codes[index]
          || entry.position !== index || !['recognized', 'unknown', 'ambiguous'].includes(entry.status)
          || !Array.isArray(entry.candidates))) throw new Error('Invalid airport response.');
      await Promise.all(entries.map(entry => storage.setItem(key(entry.code), JSON.stringify({ entry, checkedAt: now() })).catch(() => {})));
      return { route, entries, offline: false };
    } catch (error) {
      if (error.response?.status === 401 || error.response?.status === 403) throw error;
      const entries = await Promise.all(codes.map(async (code, position) => {
        try {
          const saved = JSON.parse(await storage.getItem(key(code)));
          if (saved && now() - saved.checkedAt < ttl && now() >= saved.checkedAt && saved.entry.code === code
              && ['recognized', 'unknown', 'ambiguous'].includes(saved.entry.status) && Array.isArray(saved.entry.candidates)) {
            return { ...saved.entry, position };
          }
        } catch { /* Missing, corrupt or expired cache remains unchecked. */ }
        return { code, position, status: 'pending', candidates: [] };
      }));
      return { route, entries, offline: true };
    }
  };
}
