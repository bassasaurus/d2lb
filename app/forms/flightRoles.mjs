// Match Django's flights/flight_form_checkbox_logic.html, including changes
// when deselecting a checkbox. XC is unavailable while Sim is selected.
export const FLIGHT_ROLES = [
  ['pilot_in_command', 'PIC'], ['second_in_command', 'SIC'], ['solo', 'Solo'],
  ['dual', 'Dual'], ['instructor', 'CFI'], ['simulator', 'Sim'], ['cross_country', 'XC'],
];
const clears = {
  pilot_in_command: ['second_in_command'],
  second_in_command: ['pilot_in_command', 'solo'],
  solo: ['second_in_command', 'dual', 'instructor'],
  dual: ['solo', 'second_in_command', 'instructor'],
  instructor: ['dual', 'solo'],
  simulator: ['cross_country'],
  cross_country: ['simulator'],
};
export function isFlightRoleDisabled(values, field) {
  return field === 'cross_country' && Boolean(values.simulator);
}

export function toggleFlightRole(values, field) {
  if (!Object.hasOwn(clears, field)) throw new Error('Unknown flight checkbox.');
  if (isFlightRoleDisabled(values, field)) return values;
  return { ...values, [field]: !values[field], ...Object.fromEntries(clears[field].map(key => [key, false])),
    ...(field === 'solo' && !values.solo ? {pilot_in_command:true} : {}) };
}

export const PRIMARY_FLIGHT_ROLES = ['pilot_in_command', 'second_in_command', 'solo', 'dual'];
export function hasRequiredFlightRole(values) {
  return PRIMARY_FLIGHT_ROLES.some(field => values[field] === true);
}


export function flightCrewLabel(values) {
  if (values.is_draft) return 'Draft';
  return FLIGHT_ROLES.filter(([field]) => PRIMARY_FLIGHT_ROLES.includes(field) && values[field])
    .map(([, label]) => label).join(' ');
}
