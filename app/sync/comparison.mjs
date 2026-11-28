import { formatDate } from '../formatting/dates.mjs';
import { launchLabel } from '../forms/launchMethods.mjs';
const flightFields = [
  ['date', 'Date'], ['aircraft_type', 'Aircraft'], ['registration', 'Registration'],
  ['route', 'Route'], ['duration', 'Duration'], ['launch_method', 'Launch Method'], ['pilot_in_command', 'PIC'],
  ['second_in_command', 'SIC'], ['solo', 'Solo'], ['dual', 'Dual'],
  ['instructor', 'Instructor'], ['simulator', 'Simulator'], ['cross_country', 'Cross-country'],
  ['landings_day', 'Day landings'], ['landings_night', 'Night landings'], ['night', 'Night time'],
  ['instrument', 'Instrument time'], ['simulated_instrument', 'Simulated instrument time'],
  ['approaches', 'Approaches'], ['hold', 'Holding'], ['training_program', 'Training program'], ['intercepting_tracking', 'Intercepting and Tracking'], ['remarks', 'Remarks'],
  ['night_landings_full_stop','Night landings Full Stop'],
];
const aircraftFields = [
  ['aircraft_type', 'Aircraft type'], ['aircraft_category', 'Category'], ['aircraft_class', 'Class'],
  ['piston', 'Piston'], ['turbine', 'Turbine'], ['electric', 'Electric'], ['self_launch_capable', 'Self-launch capable'], ['requires_type', 'Type rating required'],
  ['tailwheel', 'Tailwheel'], ['compleks', 'Complex'], ['high_performance', 'High performance'],
  ['simple', 'Simple'], ['superr', 'Super'], ['heavy', 'Heavy'], ['large', 'Large'],
  ['small', 'Small'], ['default_crew_role', 'Default role'], ['default_cross_country', 'Default XC'],
];
const tailnumberFields = [['registration', 'Registration'], ['aircraft', 'Aircraft'], ['is_91', 'Part 91'], ['is_135', 'Part 135'], ['is_121', 'Part 121'], ['is_125', 'Part 125'], ['is_137', 'Part 137']];
function format(value, key) {
  if (key === 'default_crew_role') return value || 'None';
  if (key === 'default_cross_country' || key === 'intercepting_tracking') value = Boolean(value);
  if (key === 'training_program') return value ? `Part ${value}` : 'Not specified';
  if (key === 'launch_method') return value ? launchLabel(value) : '—';
  if (['electric', 'self_launch_capable'].includes(key)) value = Boolean(value);
  if (['is_125', 'is_137'].includes(key)) value = Boolean(value);
  if (key === 'date') return formatDate(value, '—');
  if (key === 'approaches') return (Array.isArray(value) ? value : [])
    .filter(row => row.approach_type && row.number !== '' && row.number != null)
    .map(row => `${row.approach_type} × ${row.number}`).join(', ') || 'None';
  if (typeof value === 'boolean') return value ? 'Yes' : 'No';
  if (value == null || value === '') return '—';
  return String(value);
}
export function compareVersions(kind, local, server) {
  return (local?._default_preference || server?._default_preference ? [['aircraft_type', 'Default aircraft']] : kind === 'aircraft' ? aircraftFields : kind === 'tailnumber' ? tailnumberFields : flightFields).map(([key, label]) => {
    const localValue = format(local?.[key], key);
    const serverValue = server ? format(server[key], key) : 'Not on server';
    return { key, label, localValue, serverValue, changed: localValue !== serverValue };
  });
}
export function recordTitle(kind, record) {
  if (record._default_preference) return `Default aircraft: ${record.aircraft_type || 'None'}`;
  return kind === 'aircraft' ? record.aircraft_type : kind === 'tailnumber' ? record.registration : `${formatDate(record.date, '')} ${record.route || 'Flight'}`.trim();
}
