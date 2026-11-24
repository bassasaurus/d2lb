// Pilot categories/classes from 14 CFR 61.5(b); codes match the Django API.
export const CATEGORY_CHOICES = [['A', 'Airplane'], ['R', 'Rotorcraft'], ['GL', 'Glider'], ['PL', 'Powered-Lift'], ['LTA', 'Lighter-Than-Air']];
export const CLASS_CHOICES = [['SEL', 'Single-Engine Land'], ['MEL', 'Multi-Engine Land'], ['SES', 'Single-Engine Sea'], ['MES', 'Multi-Engine Sea'], ['HELO', 'Helicopter'], ['GYRO', 'Gyroplane'], ['BALLOON', 'Balloon'], ['AIRSHIP', 'Airship']];
export const CLASSES_BY_CATEGORY = { A: ['SEL', 'MEL', 'SES', 'MES'], R: ['HELO', 'GYRO'], GL: [], PL: [], LTA: ['BALLOON', 'AIRSHIP'] };
export const classRequired = category => Boolean(CLASSES_BY_CATEGORY[category]?.length);
export const classChoices = category => CLASS_CHOICES.filter(([key]) => CLASSES_BY_CATEGORY[category]?.includes(key));
export const classDisplay = (category, aircraftClass) => Object.hasOwn(CLASSES_BY_CATEGORY, category) && !classRequired(category)
  ? 'Not applicable' : CLASS_CHOICES.find(([key]) => key === aircraftClass)?.[1] || 'Not recorded';
export const classificationChanged = (values, original) => !original?.id
  || (values.aircraft_category || '') !== (original.aircraft_category || '')
  || (values.aircraft_class || '') !== (original.aircraft_class || '');
export function classificationErrors(values, original) {
  if (!classificationChanged(values, original)) return {};
  const category = values.aircraft_category;
  const aircraftClass = values.aircraft_class || '';
  if (!Object.hasOwn(CLASSES_BY_CATEGORY, category)) return { aircraft_category: 'Choose an aircraft category.' };
  if (classRequired(category)) {
    if (!aircraftClass) return { aircraft_class: 'Choose an aircraft class.' };
    if (!CLASSES_BY_CATEGORY[category].includes(aircraftClass)) return { aircraft_class: 'Aircraft category and class must agree.' };
  } else if (aircraftClass) return { aircraft_class: 'Class does not apply to this category.' };
  return {};
}
export function withAircraftCategory(values, category) {
  const aircraftClass = CLASSES_BY_CATEGORY[category]?.includes(values.aircraft_class) ? values.aircraft_class : '';
  return { ...values, aircraft_category: category, aircraft_class: aircraftClass };
}
