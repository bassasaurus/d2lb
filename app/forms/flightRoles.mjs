// Match Django's flights/flight_form_checkbox_logic.html, including changes
// when deselecting a checkbox. Sim and XC additionally exclude each other.
export const FLIGHT_ROLES = [
  ['pilot_in_command', 'PIC'], ['second_in_command', 'SIC'], ['solo', 'Solo'],
  ['dual', 'Dual'], ['instructor', 'CFI'], ['simulator', 'Sim'], ['cross_country', 'XC'],
];
const clears = {
  pilot_in_command: ['second_in_command'],
  second_in_command: ['pilot_in_command', 'solo'],
  solo: ['pilot_in_command', 'second_in_command', 'dual', 'instructor'],
  dual: ['solo', 'second_in_command', 'instructor'],
  instructor: ['dual', 'solo'],
  simulator: ['cross_country'],
  cross_country: ['simulator'],
};
export function toggleFlightRole(values, field) {
  if (!Object.hasOwn(clears, field)) throw new Error('Unknown flight checkbox.');
  return { ...values, [field]: !values[field], ...Object.fromEntries(clears[field].map(key => [key, false])) };
}

export const PRIMARY_FLIGHT_ROLES = ['pilot_in_command', 'second_in_command', 'solo', 'dual'];
export function hasRequiredFlightRole(values) {
  return PRIMARY_FLIGHT_ROLES.some(field => values[field] === true);
}
