export const remindersUrl = '/api/mobile/reminders/manage/';

export const reminderKinds = [
  ['expiration', 'Expiration Date'],
  ['flight_time', 'Flight Time Milestone'],
  ['time_in_type', 'Time in Type'],
  ['crew_in_type', 'Crew Position in Type'],
  ['company_time', 'Time at Company'],
];

export const crewPositions = [
  ['pilot_in_command', 'PIC'],
  ['second_in_command', 'SIC'],
  ['solo', 'Solo'],
  ['dual', 'Dual'],
];

export function reminderDateLabel(value) {
  return new Date(`${value}T12:00:00`).toLocaleDateString(undefined, {
    year: 'numeric', month: 'short', day: 'numeric',
  });
}
