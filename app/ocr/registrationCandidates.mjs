export const normalizeRegistration = value => String(value || '').toUpperCase()
  .replace(/[‐‑‒–—−]/g, '-').replace(/\s/g, '');
export function registrationCandidates(lines, aircraft = '') {
  const candidates = [];
  for (const line of Array.isArray(lines) ? lines : []) {
    if (typeof line !== 'string') continue;
    const upper = line.toUpperCase().replace(/[‐‑‒–—−]/g, '-');
    const parts = [normalizeRegistration(upper), ...(upper.match(/[A-Z0-9]+(?:\s*-\s*[A-Z0-9]+)?/g) || [])];
    for (const part of parts) {
      const value = normalizeRegistration(part);
      if (value.length < 3 || value.length > 8 || value === normalizeRegistration(aircraft)) continue;
      if (!/^[A-Z0-9]+(?:-[A-Z0-9]+)?$/.test(value) || !/[A-Z]/.test(value)) continue;
      if (!/\d/.test(value) && !value.includes('-')) continue;
      if (!candidates.includes(value)) candidates.push(value);
    }
  }
  return candidates.sort((a, b) => Number(b.includes('-') || b.startsWith('N')) - Number(a.includes('-') || a.startsWith('N'))).slice(0, 8);
}
export function scannedTailnumber(rows, registration, aircraft) {
  const value = normalizeRegistration(registration);
  const matches = rows.filter(row => !row.pending_delete && row.sync_state !== 'pending_delete' && normalizeRegistration(row.registration).replace(/-/g, '') === value.replace(/-/g, ''));
  const existing = matches.find(row => row.aircraft === aircraft);
  if (existing) return { kind: 'existing', item: existing };
  if (matches.length) return { kind: 'other-aircraft', item: matches[0] };
  return { kind: 'new', registration: value };
}
export function createdTailnumberSelection(result, aircraft) {
  return result?.aircraft === aircraft && typeof result.registration === 'string' ? result.registration : null;
}
export function flightReturnTarget(destination, state) {
  return destination?.stackKey === state.key && state.routes.some(screen => screen.key === destination.key)
    ? { key: destination.key, stackKey: state.key } : null;
}
