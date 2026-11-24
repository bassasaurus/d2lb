import test from 'node:test';
import assert from 'node:assert/strict';
import { APPROACH_CHOICES, approachLabel, approachOptions } from '../app/forms/approachChoices.mjs';

test('AIM choices distinguish RNAV minima and keep ILS CAT II and CAT III', () => {
  const codes = APPROACH_CHOICES.map(([code]) => code);
  for (const code of ['CATII', 'CATIII', 'GLS', 'PAR', 'ASR', 'LNAV', 'LP', 'LNAV/VNAV', 'LPV', 'RNP AR'])
    assert.ok(codes.includes(code), code);
  assert.equal(new Set(codes).size, codes.length);
  assert.equal(approachLabel('CATII'), 'ILS CAT II');
  assert.equal(approachLabel('CATIII'), 'ILS CAT III');
  assert.equal(approachOptions('').some(item => ['GPS', 'RNAV', 'MLS'].includes(item.value)), false);
});

test('existing generic and older mobile choices remain readable without inventing minima', () => {
  for (const value of ['GPS', 'RNAV', 'MLS', 'CAT II', 'CAT III']) {
    const options = approachOptions(value);
    assert.ok(options.some(item => item.value === value));
    assert.equal(options.filter(item => item.value === value).length, 1);
    assert.ok(approachLabel(value));
  }
  assert.equal(approachLabel('CUSTOM OLD'), 'CUSTOM OLD');
});
