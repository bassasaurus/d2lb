export const remindersUrl = '/api/mobile/reminders/manage/';

export const reminderKinds = [
  ['expiration', 'Custom'],
  ['flight_review', 'BFR'],
  ['instructor_renewal', 'FIRC'],
  ['ipc', 'IPC'],
  ['flight_time', 'Flight Time Milestone'],
  ['flight_condition', 'Flight Conditions'],
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

export const flightReviewTypes = [
  ['flight_review', 'Flight Review'],
  ['proficiency_check', 'Qualifying Pilot Proficiency Check'],
  ['practical_test', 'Pilot Practical Test'],
  ['cfi_practical_test', 'Flight Instructor Practical Test'],
  ['wings', 'Completed WINGS Phase'],
];

export const flightConditions = [
  ['pilot_in_command', 'PIC'],
  ['second_in_command', 'SIC'],
  ['solo', 'Solo'],
  ['dual', 'Dual'],
  ['instructor', 'CFI'],
  ['simulator', 'Sim'],
  ['cross_country', 'Cross-country'],
];
