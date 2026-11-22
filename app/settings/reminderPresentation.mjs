import { formatDate } from '../formatting/dates.mjs';
const priority = { danger: 0, warning: 1, success: 2, neutral: 3 };
export function orderedReminders(rows) {
  return [...rows].sort((a, b) => {
    const band = (priority[a.severity] ?? 3) - (priority[b.severity] ?? 3);
    if (band) return band;
    const category = row => row.medical && row.missing ? -1 : row.days_remaining != null ? 0 : row.completion_percent != null ? 1 : 2;
    const type = category(a) - category(b);
    if (type) return type;
    if (category(a) === 0) return Number(a.days_remaining) - Number(b.days_remaining);
    if (category(a) === 1 && a.milestone_state && b.milestone_state) return (a.milestone_state === 'completed' ? 0 : 1) - (b.milestone_state === 'completed' ? 0 : 1)
      || Number(a.hours_remaining || 0) - Number(b.hours_remaining || 0);
    if (category(a) === 1) return Number(b.completion_percent) - Number(a.completion_percent)
      || Number(a.hours_remaining || 0) - Number(b.hours_remaining || 0);
    return 0;
  });
}
const tones = {
  light: {
    danger: { background: '#fce8e8', border: '#e6b5b5', text: '#7f1d1d' },
    warning: { background: '#fff0df', border: '#d6a36e', text: '#111111' },
    success: { background: '#e5f4e9', border: '#a8cdb2', text: '#14532d' },
  },
  dark: {
    danger: { background: '#3b2027', border: '#854550', text: '#ffc6ca' },
    warning: { background: '#fff0df', border: '#d6a36e', text: '#111111' },
    success: { background: '#183222', border: '#3c7652', text: '#b7efc9' },
  },
};
export function reminderTone(severity, dark, colors, plain = false, milestoneState) {
  if (milestoneState === 'completed') return { ...tones.light.success, text: '#111111' };
  const tone = tones[dark ? 'dark' : 'light'][severity];
  if (!tone) return { background: colors.surface, border: 'transparent', text: colors.text };
  return { ...tone, ...(plain ? { background: colors.surface, border: 'transparent' } : {}) };
}

export function reminderGroups(rows) {
  const groups = [
    { key: 'regulatory', title: 'Reminders', rows: [] },
    { key: 'milestones', title: 'Milestones', rows: [] },
  ];
  for (const row of rows) {
    const regulatory = row.medical || ['expiration', 'flight_review', 'instructor_renewal', 'ipc'].includes(row.kind);
    groups[regulatory ? 0 : 1].rows.push(row);
  }
  return groups;
}

export function isMilestone(row) {
  return !row.medical && ['flight_time', 'flight_condition', 'time_in_type', 'crew_in_type', 'company_time'].includes(row.kind);
}

export function snoozeKey(row) {
  return `${row.medical ? 'medical' : row.id}:${row.key ?? (row.medical ? row.message : row.due_date ?? row.message)}`;
}

export function cautionDismissalKey(row) {
  return `dismissed-caution:${snoozeKey(row)}`;
}

export function cautionDismissed(row, saved) {
  return row.severity === 'warning' && saved[cautionDismissalKey(row)] === true;
}

export function ifrDismissalKey(row) {
  return `dismissed-ifr:${row.category ?? row.ipc_category ?? ''}`;
}

export function ifrDismissed(row, saved) {
  return row.kind === 'ipc' && saved[ifrDismissalKey(row)] === true;
}

export function logbookAlerts(rows, snoozed = {}, now = Date.now()) {
  return orderedReminders(rows.filter(row =>
    (isMilestone(row) ? (row.milestone_state === 'approaching' || row.severity === 'success') : ['danger', 'warning'].includes(row.severity))
    && !ifrDismissed(row, snoozed)
    && !cautionDismissed(row, snoozed)
    && (isMilestone(row) || !(Number(snoozed[snoozeKey(row)]) > now))));
}


export function reminderDeadline(row) {
  if (!row.due_date || isMilestone(row)) return null;
  const date = new Date(`${row.due_date}T12:00:00`);
  if (Number.isNaN(date.getTime())) return null;
  const label = formatDate(row.due_date);
  const message = String(row.status_message || row.message || '').replace(/\b0(\d)\b/g, '$1');
  return message.includes(label) ? null : `${row.medical ? 'Expires' : 'Review date'}: ${label}`;
}
