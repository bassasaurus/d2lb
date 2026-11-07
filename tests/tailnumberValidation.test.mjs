import test from 'node:test';
import assert from 'node:assert/strict';
import { OPERATING_RULES, tailnumberSchema } from '../app/forms/tailnumberValidation.mjs';
const valid = { aircraft: 'C172', registration: 'N1234', is_91: true, is_135: false, is_121: false };
test('tailnumber requires registration and an aircraft', () => {
  assert.equal(tailnumberSchema.isValidSync(valid), true);
  for (const registration of ['', 'N1', 'N12345678']) {
    assert.equal(tailnumberSchema.isValidSync({ ...valid, registration }), false);
  }
  assert.equal(tailnumberSchema.isValidSync({ ...valid, aircraft: '' }), false);
});
test('exactly one operating rule is required', () => {
  assert.equal(tailnumberSchema.isValidSync({ ...valid, is_91: false }), false);
  assert.equal(tailnumberSchema.isValidSync({ ...valid, is_135: true }), false);
  for (const [key] of OPERATING_RULES) {
    assert.equal(tailnumberSchema.isValidSync({ ...valid, is_91: false, [key]: true }), true);
  }
});
test('missing rule has a field-specific Required error for inline display', () => {
  try {
    tailnumberSchema.validateSync({ ...valid, registration: '', is_91: false }, { abortEarly: false });
    assert.fail('Missing values must be rejected');
  } catch (error) {
    assert.ok(error.inner.some(item => item.path === 'registration' && item.message === 'Required'));
    assert.ok(error.inner.some(item => item.path === 'operating_rules' && item.message === 'Required'));
  }
});
