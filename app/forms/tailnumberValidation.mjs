import * as yup from 'yup';

export const OPERATING_RULES = [['is_91', 'Part 91'], ['is_135', 'Part 135'], ['is_121', 'Part 121']];
export const tailnumberSchema = yup.object({
  aircraft: yup.string().required('Required'),
  registration: yup.string().required('Required').min(3, 'Use 3–8 characters.').max(8, 'Use 3–8 characters.'),
}).test('operating-rule', 'Required', function(values) {
  const selected = OPERATING_RULES.filter(([key]) => values[key] === true).length;
  return selected === 1 || this.createError({ path: 'operating_rules', message: selected ? 'Choose one operating rule.' : 'Required' });
});
