export const FLIGHT_SYNC_LIMIT = 100;

// Fetch only the recent window. Never treat an interrupted download as complete.
export async function downloadFlightWindow({ origin, getPage, isCurrent }) {
  const flights = [];
  let next = '/api/flights/';
  const visited = new Set();
  while (next && flights.length < FLIGHT_SYNC_LIMIT) {
    const url = new URL(next, origin);
    if (url.origin !== new URL(origin).origin || visited.has(url.href)) {
      throw new Error('Invalid pagination link; local records were preserved.');
    }
    visited.add(url.href);
    const page = await getPage(url.href);
    if (!await isCurrent()) throw new Error('Account changed during refresh.');
    if (!Array.isArray(page.results)) throw new Error('Invalid flight response.');
    flights.push(...page.results.slice(0, FLIGHT_SYNC_LIMIT - flights.length));
    next = page.next;
  }
  return flights;
}
