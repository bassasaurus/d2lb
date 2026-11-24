import { toggleFlightRole } from './flightRoles.mjs';

export function toggleAircraftFlightDefault(aircraft, field) {
  if (field === 'cross_country') return { ...aircraft, default_cross_country: !aircraft.default_cross_country };
  if (!['PIC', 'SIC'].includes(field)) throw new Error('Unknown flight default.');
  return { ...aircraft, default_crew_role: aircraft.default_crew_role === field ? '' : field };
}

export function applyAircraftFlightDefaults(values, aircraft, existing = false) {
  if (existing || !aircraft) return values;
  let next = { ...values, pilot_in_command: false, second_in_command: false };
  if (aircraft.default_crew_role === 'PIC') next = toggleFlightRole(next, 'pilot_in_command');
  if (aircraft.default_crew_role === 'SIC') next = toggleFlightRole(next, 'second_in_command');
  return { ...next, cross_country: !next.simulator && aircraft.default_cross_country === true };
}
