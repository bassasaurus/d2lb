const flightFields = [
  ['date', 'Date'], ['aircraft_type', 'Aircraft'], ['registration', 'Registration'],
  ['route', 'Route'], ['duration', 'Duration'], ['pilot_in_command', 'PIC'],
  ['second_in_command', 'SIC'], ['solo', 'Solo'], ['dual', 'Dual'],
  ['instructor', 'Instructor'], ['simulator', 'Simulator'], ['cross_country', 'Cross-country'],
  ['landings_day', 'Day landings'], ['landings_night', 'Night landings'], ['night', 'Night time'],
  ['instrument', 'Instrument time'], ['simulated_instrument', 'Simulated instrument time'],
  ['approaches', 'Approaches'], ['hold', 'Holding'], ['remarks', 'Remarks'],
];
const aircraftFields = [
  ['aircraft_type', 'Aircraft type'], ['aircraft_category', 'Category'], ['aircraft_class', 'Class'],
  ['piston', 'Piston'], ['turbine', 'Turbine'], ['requires_type', 'Type rating required'],
  ['tailwheel', 'Tailwheel'], ['compleks', 'Complex'], ['high_performance', 'High performance'],
  ['simple', 'Simple'], ['superr', 'Super'], ['heavy', 'Heavy'], ['large', 'Large'],
  ['medium', 'Medium'], ['small', 'Small'], ['light_sport', 'Light sport'],
];
const tailnumberFields = [['registration', 'Registration'], ['aircraft', 'Aircraft'], ['is_91', 'Part 91'], ['is_135', 'Part 135'], ['is_121', 'Part 121']];
function format(value, key) {
  if (key === 'approaches') return (Array.isArray(value) ? value : [])
    .filter(row => row.approach_type && row.number !== '' && row.number != null)
    .map(row => `${row.approach_type} × ${row.number}`).join(', ') || 'None';
  if (typeof value === 'boolean') return value ? 'Yes' : 'No';
  if (value == null || value === '') return '—';
  return String(value);
}
export function compareVersions(kind, local, server) {
  return (kind === 'aircraft' ? aircraftFields : kind === 'tailnumber' ? tailnumberFields : flightFields).map(([key, label]) => {
    const localValue = format(local?.[key], key);
    const serverValue = server ? format(server[key], key) : 'Not on server';
    return { key, label, localValue, serverValue, changed: localValue !== serverValue };
  });
}
export function recordTitle(kind, record) {
  return kind === 'aircraft' ? record.aircraft_type : kind === 'tailnumber' ? record.registration : `${record.date || ''} ${record.route || 'Flight'}`.trim();
}
