import test from 'node:test';
import assert from 'node:assert/strict';
import {validateIacra, validateSummary, metricValue} from '../app/stats/summary.mjs';

const labels = ['Total', 'Instruction Received', 'Solo', 'PIC', 'SIC',
  'Cross Country Instruction Received', 'Cross Country Solo', 'Cross Country PIC', 'Cross Country SIC',
  'Instrument', 'Night Instruction Received', 'Night Take-Off/Landing', 'Night PIC', 'Night SIC',
  'Night Take-Off/Landing PIC', 'Night Take-Off/Landing SIC'];
function fixture() {
  return {rows: [{code: 'GL', label: 'Gliders', cells: labels.map((label, i) => ({label,
    value: i === 0 ? '3.6' : [11, 14, 15].includes(i) ? 0 : '0.0',
    shaded: [6, 7, 8, 10, 11, 12, 13, 14, 15].includes(i), count: [11, 14, 15].includes(i)}))}],
    classes: [{code: 'GL', label: 'Glider', total: '3.6', pic: '2.4', sic: '0.0', instruction: '1.2'}],
    launches: [{code: 'GL', flights: 3, pic: 2, dual: 1, aerotow: 1, ground: 1, self_launch: 1}],
    devices: [{type: 'FTD', se: '5.0', me: null, helicopter: null}],
    note: 'Counts use individual aircraft flight records only.'};
}
test('IACRA uses server values and keeps hours, counts and unavailable cells distinct', () => {
  const report = fixture();
  assert.equal(validateIacra(report), report);
  assert.equal(metricValue('count', report.launches[0].flights), '3');
  assert.equal(metricValue('hours', report.rows[0].cells[0].value), '3.6');
  assert.equal(metricValue('hours', null), '—');
  assert.equal(metricValue('hours', 0), '0.0');
  report.rows[0].cells[5].value = null;
  assert.equal(validateIacra(report), report);
});
test('malformed reports cannot replace a valid offline summary', () => {
  for (const mutate of [
    report => {report.rows[0].cells.pop();},
    report => {report.rows[0].cells[0].value = 'bad';},
    report => {report.rows[0].cells[0].value = true;},
    report => {report.rows[0].cells[11].value = 1.5;},
    report => {report.launches[0].flights = -1;},
    report => {report.launches[0].aerotow = 1.5;},
    report => {report.classes[0].pic = null;},
    report => {report.devices[0].se = 'bad';},
  ]) {
    const report = fixture();
    mutate(report);
    assert.throws(() => validateIacra(report));
  }
});
test('the report survives durable offline snapshot storage without calculating values on the phone', async () => {
  const {DatabaseSync} = await import('node:sqlite');
  const {adapter} = await import('./helpers/sqlite.mjs');
  const {createFlightStore} = await import('../app/storage/flightStore.mjs');
  const db = new DatabaseSync(':memory:');
  try {
    let store = await createFlightStore(adapter(db));
    const report = fixture();
    for (const [code, label, instrument] of [['A', 'Airplanes', '0.5'], ['FFS', 'FFS', '0.7']]) {
      const row = structuredClone(report.rows[0]);
      row.code = code;
      row.label = label;
      row.cells[9].value = instrument;
      report.rows.push(row);
    }
    const summary = {schema_version: 1, downloaded_at: '2026-11-24T12:00:00Z', totals: [], aircraft: [], iacra: report};
    await store.cacheReference('owner', 'totals-stats', [validateSummary(summary)]);
    store = await createFlightStore(adapter(db));
    const saved = validateSummary((await store.reference('owner', 'totals-stats'))[0]);
    assert.deepEqual(saved.iacra, summary.iacra);
    assert.equal(saved.iacra.rows.find(row => row.code === 'A').cells[9].value, '0.5');
    assert.equal(saved.iacra.rows.find(row => row.code === 'FFS').cells[9].value, '0.7');
    assert.equal((await store.reference('other-owner', 'totals-stats')).length, 0);
  } finally {db.close();}
});
test('empty accounts and previous snapshots remain readable', () => {
  assert.doesNotThrow(() => validateIacra({rows: [], classes: [], launches: [], devices: [], note: ''}));
  assert.doesNotThrow(() => validateSummary({schema_version: 1, downloaded_at: '2026-11-24T12:00:00Z', totals: [], aircraft: []}));
});
