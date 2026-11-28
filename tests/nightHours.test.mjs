import test from 'node:test';
import assert from 'node:assert/strict';
import * as yup from 'yup';
import { nightDurationRule } from '../app/forms/nightHours.mjs';

const schema = yup.object({duration: yup.number().required(), night: yup.number().min(0).test(nightDurationRule)});

test('night accepts blank, zero, less than or equal to duration', async () => {
  for (const night of [undefined, '0', '0.3', '1.2']) {
    assert.ok(await schema.isValid({duration:'1.2',night}));
  }
});

test('night exceeding duration is attached to Night with concise feedback', async () => {
  await assert.rejects(schema.validate({duration:'1.2',night:'1.3'}), error =>
    error.path === 'night' && error.message === 'Night cannot exceed Duration.');
});

test('reducing duration revalidates night and correction clears the error', async () => {
  assert.ok(await schema.isValid({duration:'2.0',night:'1.5'}));
  assert.equal(await schema.isValid({duration:'1.0',night:'1.5'}), false);
  assert.ok(await schema.isValid({duration:'1.0',night:'1.0'}));
  assert.equal(await schema.isValid({duration:'0',night:'0.1'}), false);
  assert.equal(await schema.isValid({duration:'bad',night:'0.1'}), false);
});
