import test from 'node:test';
import assert from 'node:assert/strict';
import { tailnumberSuggestions } from '../app/components/tailnumberSuggestions.mjs';
const rows = [
  { id: 1, aircraft: 'C172', registration: 'N100' },
  { id: 2, aircraft: 'C172', registration: 'N2' },
  { id: 3, aircraft: 'C172', registration: 'N10' },
  { id: 4, aircraft: 'A320', registration: 'N1' },
  { id: 5, aircraft: 'C172', registration: 'C-FABC' },
];
test('suggestions belong to the selected aircraft and sort naturally', () => {
  assert.deepEqual(tailnumberSuggestions(rows, 'C172', 'n').rows.map(row => row.registration), ['N2', 'N10', 'N100']);
});
test('search ignores case, spaces and registration hyphens', () => {
  assert.deepEqual(tailnumberSuggestions(rows, 'C172', 'c fa').rows.map(row => row.registration), ['C-FABC']);
});
test('a bounded result set reports remaining matches, and unknown queries have no match', () => {
  const result = tailnumberSuggestions(rows, 'C172', '', 2);
  assert.equal(result.rows.length, 2);
  assert.equal(result.total, 4);
  assert.deepEqual(tailnumberSuggestions(rows, 'C172', 'UNKNOWN').rows, []);
});
