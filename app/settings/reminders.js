import { formatDate } from '../formatting/dates.mjs';
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

export const reminderDateLabel = formatDate;

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

export const reminderTypeDescriptions = {
  flight_review: 'Biennial Flight Review',
  instructor_renewal: 'Flight Instructor Refresher Course',
  ipc: 'Instrument Proficiency Check',
};
