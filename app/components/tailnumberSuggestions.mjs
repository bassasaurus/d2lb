export function tailnumberSuggestions(rows, aircraft, query, limit = 6) {
  const normalize = value => String(value || '').replace(/[-\s]/g, '').toUpperCase();
  const search = normalize(query);
  const matches = rows.filter(row => row.aircraft === aircraft && normalize(row.registration).includes(search))
    .sort((a, b) => a.registration.localeCompare(b.registration, 'en', { numeric: true, sensitivity: 'base', ignorePunctuation: true }));
  return { rows: matches.slice(0, limit), total: matches.length };
}
