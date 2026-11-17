// Incomplete new flights stay outside the sync queue until validation succeeds.
export function flightFormAction({ valid, date, allowDraft }) {
  if (valid) return 'save';
  if (allowDraft && typeof date === 'string' && date.trim()) return 'draft';
  return 'disabled';
}
