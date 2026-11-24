import * as yup from 'yup';
import { ENGINE_CHOICES, WEIGHT_CHOICES } from './fields.mjs';
import { classificationErrors } from './classification.mjs';
import { engineRequired } from './characteristics.mjs';

export function createAircraftSchema(original) {
  return yup.object({
  aircraft_type: yup.string().matches(/^[A-Za-z0-9-]{1,10}$/, { message: 'Use 1–10 letters, numbers or hyphens.', excludeEmptyString: true }).required('Required'),
  aircraft_category: yup.string(),
  aircraft_class: yup.string(),
}).test('category-class', 'Choose an aircraft class.', function(values) {
    const error = Object.entries(classificationErrors(values, original))[0];
    return !error || this.createError({ path: error[0], message: error[1] });
  })
  .test('engine-choice', 'Required', function(values) {
    if (!engineRequired(values)) return true;
    const count = ENGINE_CHOICES.filter(([key]) => values[key] === true).length;
    return count === 1 || this.createError({ path: 'engine', message: count ? 'Choose one engine.' : 'Required' });
  })
  .test('weight-choice', 'Required', function(values) {
    const count = WEIGHT_CHOICES.filter(([key]) => values[key] === true).length;
    return count === 1 || this.createError({ path: 'weight_category', message: count ? 'Choose one weight category.' : 'Required' });
  });
}
export const aircraftSchema = createAircraftSchema();
