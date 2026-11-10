export const remindersUrl = '/api/mobile/reminders/manage/';

export function reminderDateLabel(value) {
  return new Date(`${value}T12:00:00`).toLocaleDateString(undefined, {
    year: 'numeric', month: 'short', day: 'numeric',
  });
}
