import { snoozeKey } from './reminderPresentation.mjs';

export function activeSnooze(row, snoozed, now = Date.now()) {
  const until = Number(snoozed[snoozeKey(row)]);
  return Number.isFinite(until) && until > now ? until : null;
}

export function withoutSnooze(row, snoozed) {
  const next = { ...snoozed };
  delete next[snoozeKey(row)];
  return next;
}

export function parseSnoozes(value) {
  try {
    const data = JSON.parse(value || '{}');
    return data && typeof data === 'object' && !Array.isArray(data) ? data : {};
  } catch { return {}; }
}

export function clearResourcePreferences(saved, resource) {
  const prefix = `${resource}:`;
  return Object.fromEntries(Object.entries(saved).filter(([key]) =>
    !key.startsWith(prefix) && !key.startsWith(`dismissed-caution:${prefix}`)));
}
