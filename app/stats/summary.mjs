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
  return (field === 'count' || field.startsWith('landings_')) ? String(number) : number.toFixed(1);
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
  if (data.simulator_program_totals !== undefined) {
    if (!Array.isArray(data.simulator_program_totals) || data.simulator_program_totals.some(row => !row
      || !['', '141', '142'].includes(row.program) || typeof row.label !== 'string'
      || !['total', 'ffs', 'ftd', 'atd', 'unclassified'].every(key => row[key] != null && row[key] !== '' && typeof row[key] !== 'boolean' && Number.isFinite(Number(row[key])) && Number(row[key]) >= 0)))
      throw new Error('Invalid simulator program totals');
  }
  if (data.iacra !== undefined) validateIacra(data.iacra);
  const credit = data.instrument_device_credit;
  if (credit) {
    if (!Array.isArray(credit.rows) || typeof credit.basis !== 'string' || typeof credit.note !== 'string'
      || ![credit.device_credit, credit.combined_limit].every(value => value !== null && Number.isFinite(Number(value))))
      throw new Error('Invalid instrument credit response');
    for (const row of credit.rows) {
      if (!row || typeof row.type !== 'string' || ![row.logged, row.eligible, row.limit].every(value => value !== null && Number.isFinite(Number(value))))
        throw new Error('Invalid instrument credit row');
    }
  }
  return data;
}

export function validateIacra(report) {
  const number = value => value != null && value !== '' && typeof value !== 'boolean' && Number.isFinite(Number(value)) && Number(value) >= 0;
  const figure = value => value === null || number(value);
  const count = value => number(value) && Number.isInteger(Number(value));
  if (!report || !['rows', 'classes', 'launches', 'devices'].every(key => Array.isArray(report[key])) || typeof report.note !== 'string')
    throw new Error('Invalid IACRA response');
  for (const row of report.rows) {
    if (!row || typeof row.code !== 'string' || typeof row.label !== 'string' || !Array.isArray(row.cells) || row.cells.length !== 16
      || !row.cells.every(cell => cell && typeof cell.label === 'string' && typeof cell.shaded === 'boolean' && typeof cell.count === 'boolean'
        && figure(cell.value) && (!cell.count || cell.value === null || count(cell.value))))
      throw new Error('Invalid IACRA row');
  }
  for (const row of report.classes) {
    if (!row || typeof row.code !== 'string' || typeof row.label !== 'string' || !['total', 'pic', 'sic', 'instruction'].every(key => number(row[key])))
      throw new Error('Invalid IACRA class');
  }
  for (const row of report.launches) {
    if (!row || !['GL', 'LTA'].includes(row.code) || !['flights', 'pic', 'dual', 'aerotow', 'ground', 'self_launch'].every(key => count(row[key])))
      throw new Error('Invalid IACRA count');
  }
  for (const row of report.devices) {
    if (!row || !['FFS', 'FTD', 'ATD'].includes(row.type) || !['se', 'me', 'helicopter'].every(key => figure(row[key])))
      throw new Error('Invalid IACRA device');
  }
  return report;
}
