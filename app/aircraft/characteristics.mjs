export const flagApplicable = (values, key) => key !== 'simple' && (values.aircraft_category === 'A' || key === 'requires_type' && ['R', 'PL'].includes(values.aircraft_category));
export const ENGINE_CHOICES = [['piston', 'Piston'], ['turbine', 'Turbine'], ['electric', 'Electric']];
export const WEIGHT_CHOICES = [['small', 'Small'], ['large', 'Large'], ['heavy', 'Heavy'], ['superr', 'Super']];
export const engineRequired = values => values.aircraft_category !== 'GL'
  && !(values.aircraft_category === 'LTA' && values.aircraft_class === 'BALLOON');
export function normalizeCharacteristics(values) {
  const result = { ...values };
  if (!engineRequired(result)) for (const [key] of ENGINE_CHOICES) result[key] = false;
  for (const key of ['requires_type', 'tailwheel', 'compleks', 'high_performance']) {
    if (result.aircraft_category && !flagApplicable(result, key)) result[key] = false;
  }
  if (result.aircraft_category === 'PL') result.requires_type = true;
  // Preserve historical metadata while removing Simple from editable choices.
  result.simple = result.aircraft_category === 'A' && Boolean(result.simple);
  if (result.aircraft_category !== 'GL') result.self_launch_capable = false;
  if (result.medium) result.small = true;
  delete result.medium;
  delete result.light_sport;
  return result;
}

// A radio group is one form change. Updating each boolean separately can leave
// Formik validation attached to an earlier combination of field values.
export function selectCharacteristic(values, choices, selected) {
  return {...values, ...Object.fromEntries(choices.map(([key]) => [key, key === selected]))};
}
