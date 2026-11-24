import { ENGINE_CHOICES, WEIGHT_CHOICES, normalizeCharacteristics } from './characteristics.mjs';
export { ENGINE_CHOICES, WEIGHT_CHOICES } from './characteristics.mjs';
export { CATEGORY_CHOICES, CLASS_CHOICES } from './classification.mjs';
export const FLAGS = [['requires_type', 'Type rating required'], ['tailwheel', 'Tailwheel'], ['compleks', 'Complex'], ['high_performance', 'High performance']];
export function aircraftValues(record = {}) {
  const values = { ...record, aircraft_type: record.aircraft_type || '', aircraft_category: record.aircraft_category || '', aircraft_class: record.aircraft_class || '' };
  for (const [key] of [...ENGINE_CHOICES, ...WEIGHT_CHOICES, ...FLAGS]) values[key] = Boolean(record[key]);
  return normalizeCharacteristics(values);
}
