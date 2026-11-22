export function reminderDestination(row, saved = []) {
  if (row.medical || (typeof row.id === 'string' && row.id.startsWith('instrument-currency'))) return { name: 'ManageReminders' };
  const reminder = saved.find(item => item.id === row.id);
  return reminder ? { name: 'EditReminder', params: { reminder } } : null;
}

export function reminderConfirmation(action, days) {
  if (action === 'snooze') return `Snoozed for ${days} ${days === 1 ? 'day' : 'days'}.`;
  return action === 'caution' ? 'Hidden until this reminder turns red.' : 'Milestone dismissed.';
}
