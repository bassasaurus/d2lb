export const METRICS = [
  ['total_time', 'Total time'], ['pilot_in_command', 'PIC'], ['second_in_command', 'SIC'],
  ['cross_country', 'Cross-country'], ['night', 'Night'], ['instrument', 'Instrument'],
  ['simulated_instrument', 'Simulated instrument'], ['simulator', 'Simulator'],
  ['instructor', 'Instructor'], ['dual', 'Dual received'], ['solo', 'Solo'],
  ['landings_day', 'Day landings'], ['landings_night', 'Night landings'],
];
export const RECENCY = [
  ['last_flown', 'Last flown'], ['last_30', '30 days'], ['last_60', '60 days'],
  ['last_90', '90 days'], ['last_180', '6 months'], ['last_yr', '12 months'],
  ['last_2yr', '24 months'], ['ytd', 'Year to date'],
];
export function metricValue(field, value) {
  if (value === null || value === undefined || value === '') return '—';
  if (field === 'last_flown') return String(value);
  const number = Number(value);
  if (!Number.isFinite(number)) return '—';
  return field.startsWith('landings_') ? String(number) : number.toFixed(1);
}
export function validateSummary(data) {
  if (data?.schema_version !== 1 || !Number.isFinite(Date.parse(data.downloaded_at))
    || !Array.isArray(data.totals) || !Array.isArray(data.aircraft)) throw new Error('Invalid summary response');
  for (const [rows, label] of [[data.totals, 'total'], [data.aircraft, 'aircraft_type']]) {
    for (const row of rows) {
      if (!row || typeof row[label] !== 'string' || !row[label]) throw new Error('Invalid summary row');
      for (const [field] of [...METRICS, ...RECENCY]) {
        const value = row[field];
        if (value != null && field !== 'last_flown' && (typeof value === 'boolean' || value === '' || !Number.isFinite(Number(value)))) {
          throw new Error('Invalid summary value');
        }
      }
    }
  }
  return data;
}
