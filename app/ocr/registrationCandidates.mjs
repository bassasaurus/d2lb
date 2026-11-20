export const normalizeRegistration = value => String(value || '').toUpperCase()
  .replace(/[‐‑‒–—−]/g, '-').replace(/\s/g, '');
// Conservative OCR suggestions only. Manual registration entry is unchanged.
// N-number formats: https://www.faa.gov/licenses_certificates/aircraft_certification/aircraft_registry/forming_nnumber
export function plausibleRegistration(value) {
  if (value.length < 3 || value.length > 8) return false;
  if (/^N[1-9](?:[0-9]{0,4}|[0-9]{0,3}[A-HJ-NP-Z]|[0-9]{0,2}[A-HJ-NP-Z]{2})$/.test(value)) return true;
  if (/^(?:[A-Z]{1,3}|[0-9][A-Z]|[A-Z][0-9])-[A-Z0-9]{2,5}$/.test(value)) return true;
  // Common compact international formats. Other formats remain manually editable.
  return /^(?:JA|JR)(?:[0-9]{4}|[0-9]{3}[A-Z]|[0-9]{2}[A-Z]{2})$/.test(value)
    || /^HL[0-9]{4}$/.test(value) || /^B[0-9]{4,5}$/.test(value);
}
export function registrationCandidates(lines, aircraft = '') {
  const candidates = new Set();
  for (const line of Array.isArray(lines) ? lines : []) {
    if (typeof line !== 'string') continue;
    const upper = line.toUpperCase().replace(/[‐‑‒–—−]/g, '-');
    const whole = normalizeRegistration(upper);
    // OCR may split a single registration with spaces. Do not offer its
    // shortened tokens as competing registrations when the full line is valid.
    const parts = plausibleRegistration(whole) ? [whole]
      : (upper.match(/[A-Z0-9]+(?:\s*-\s*[A-Z0-9]+)?/g) || []);
    for (const part of parts) {
      const value = normalizeRegistration(part);
      if (value !== normalizeRegistration(aircraft) && plausibleRegistration(value)) candidates.add(value);
    }
  }
  return [...candidates];
}
export function registrationReview(candidates) {
  // These are text snippets, not confidence-ranked alternatives. Never guess
  // which registration the user meant when several distinct values remain.
  return candidates.length === 1 ? candidates[0] : '';
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

export function registrationPasses(passes, aircraft = '', allowPossibleReadings = false) {
  const readings = (Array.isArray(passes) ? passes : []).map(lines => {
    const exact = registrationCandidates(lines, aircraft);
    if (!allowPossibleReadings) return exact;
    const possible = (Array.isArray(lines) ? lines : []).map(possibleNNumber).filter(value => value && value !== normalizeRegistration(aircraft));
    return [...new Set([...exact, ...possible])];
  });
  const votes = new Map();
  for (const values of readings) for (const value of values) votes.set(value, (votes.get(value) || 0) + 1);
  const ranked = [...votes].sort((a, b) => b[1] - a[1]);
  // A pass that sees two registrations proves this is not a single target.
  // Additional focused passes must not vote a second real registration away.
  if (readings.some(values => values.length > 1)) return ranked.map(([value]) => value);
  const nonempty = readings.filter(values => values.length).length;
  // Require agreement from separate image passes and a strict majority. Distinct
  // registrations in one photo remain ambiguous. Never substitute I/1 or B/8.
  if (ranked.length > 1 && ranked[0][1] >= 2 && ranked[0][1] > nonempty / 2 && ranked[0][1] > ranked[1][1] * 2)
    return [ranked[0][0]];
  return ranked.map(([value]) => value);
}

// Only interpret look-alikes in an otherwise invalid, complete N-number-shaped
// line. The UI explicitly labels this as a possible reading. No missing symbols,
// prefix repairs, or changes to already-valid registrations are invented.
export function possibleNNumber(line) {
  if (typeof line !== 'string') return null;
  const raw = normalizeRegistration(line);
  if (plausibleRegistration(raw) || !/^N[A-Z0-9|!]{2,5}$/.test(raw)) return null;
  // L is legal in an N-number suffix. Only treat it as 1 before a digit;
  // repairing an O in the numeric prefix must not turn a valid trailing L into 1.
  const interpreted = 'N' + raw.slice(1).replace(/O/g, '0').replace(/[I|!]/g, '1').replace(/L(?=[0-9])/g, '1')
    .replace(/B(?=[0-9])/g, '8');
  return interpreted !== raw && plausibleRegistration(interpreted) ? interpreted : null;
}
export function registrationScanReview(passes, aircraft = '') {
  const candidates = registrationPasses(passes, aircraft, true);
  const possible = new Set((Array.isArray(passes) ? passes : []).flat().map(possibleNNumber).filter(Boolean));
  return { candidates, needsVerification: candidates.some(value => possible.has(value)) };
}
