import * as yup from 'yup';
import { CLASS_CHOICES, ENGINE_CHOICES, WEIGHT_CHOICES } from './fields.mjs';

export const aircraftSchema = yup.object({
  aircraft_type: yup.string().matches(/^[A-Za-z0-9-]{1,10}$/, { message: 'Use 1–10 letters, numbers or hyphens.', excludeEmptyString: true }).required('Required'),
  aircraft_category: yup.string().oneOf(['A', 'R'], 'Required').required('Required'),
  aircraft_class: yup.string().oneOf(CLASS_CHOICES.map(([key]) => key), 'Required').required('Required'),
}).test('category-class', 'Aircraft category and class must agree.', values => !values.aircraft_class || !values.aircraft_category
  || (values.aircraft_category === 'R') === ['HELO', 'GYRO'].includes(values.aircraft_class))
  .test('engine-choice', 'Required', function(values) {
    const count = ENGINE_CHOICES.filter(([key]) => values[key] === true).length;
    return count === 1 || this.createError({ path: 'engine', message: count ? 'Choose one engine.' : 'Required' });
  })
  .test('weight-choice', 'Required', function(values) {
    const count = WEIGHT_CHOICES.filter(([key]) => values[key] === true).length;
    return count === 1 || this.createError({ path: 'weight_category', message: count ? 'Choose one weight category.' : 'Required' });
  });
