export const distanceUnits = { nm: { factor: 1, label: 'NM' }, mi: { factor: 1852 / 1609.344, label: 'mi' }, km: { factor: 1.852, label: 'km' } };

export function formatMileage(distance, unit = 'nm') {
  if (!Number.isFinite(distance)) return 'Mileage unavailable';
  const conversion = distanceUnits[unit] ?? distanceUnits.nm;
  return `${(distance * conversion.factor).toLocaleString('en-US', { minimumFractionDigits: 1, maximumFractionDigits: 1 })} ${conversion.label}`;
}
