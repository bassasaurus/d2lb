export const ENGINE_CHOICES = [['turbine', 'Turbine'], ['piston', 'Piston']];
export const WEIGHT_CHOICES = [['superr', 'Super'], ['heavy', 'Heavy'], ['large', 'Large'], ['medium', 'Medium'], ['small', 'Small'], ['light_sport', 'Light sport']];
export const CATEGORY_CHOICES = [['A', 'Airplane'], ['R', 'Rotorcraft']];
export const CLASS_CHOICES = [['SEL', 'Single-engine land'], ['MEL', 'Multi-engine land'], ['SES', 'Single-engine sea'], ['MES', 'Multi-engine sea'], ['HELO', 'Helicopter'], ['GYRO', 'Gyroplane']];
export const FLAGS = [['requires_type', 'Type rating required'], ['tailwheel', 'Tailwheel'], ['compleks', 'Complex'], ['high_performance', 'High performance'], ['simple', 'Simple']];
export function aircraftValues(record = {}) {
  const values = { ...record, aircraft_type: record.aircraft_type || '', aircraft_category: record.aircraft_category || '', aircraft_class: record.aircraft_class || '' };
  for (const [key] of [...ENGINE_CHOICES, ...WEIGHT_CHOICES, ...FLAGS]) values[key] = Boolean(record[key]);
  return values;
}
