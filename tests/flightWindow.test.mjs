import test from 'node:test';
import assert from 'node:assert/strict';
import { downloadFlightWindow } from '../app/api/flightWindow.mjs';

const config = { origin: 'http://localhost:8000', isCurrent: async () => true };
const rows = count => Array.from({ length: count }, (_, id) => ({ id }));

test('downloads 100 flights without requesting older pages', async () => {
  let calls = 0;
  const flights = await downloadFlightWindow({ ...config, getPage: async () => {
    calls++;
    return { results: rows(100), next: '/api/flights/?page=2' };
  } });
  assert.equal(flights.length, 100);
  assert.equal(calls, 1);
});

test('smaller pages are followed only until the 100-flight window is filled', async () => {
  let calls = 0;
  const flights = await downloadFlightWindow({ ...config, getPage: async () => {
    calls++;
    return { results: rows(60), next: `/api/flights/?page=${calls + 1}` };
  } });
  assert.equal(flights.length, 100);
  assert.equal(calls, 2);
});

test('an oversized server page is capped at 100, and interrupted downloads fail', async () => {
  assert.equal((await downloadFlightWindow({ ...config, getPage: async () => ({ results: rows(150) }) })).length, 100);
  await assert.rejects(downloadFlightWindow({ ...config, getPage: async () => { throw new Error('offline'); } }));
  await assert.rejects(downloadFlightWindow({ ...config, isCurrent: async () => false, getPage: async () => ({ results: rows(2) }) }));
});
