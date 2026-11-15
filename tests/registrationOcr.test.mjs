import test from 'node:test';
import assert from 'node:assert/strict';
import { registrationCandidates, scannedTailnumber, createdTailnumberSelection, flightReturnTarget } from '../app/ocr/registrationCandidates.mjs';
import { scanRegistrationPhoto } from '../app/ocr/captureWorkflow.mjs';

test('extracts international registrations and excludes the selected aircraft code and labels', () => {
  assert.deepEqual(registrationCandidates(['AIRBUS A320', 'REG: N123AB', 'G–ABCD', 'C-FABC', 'JA123A'], 'A320'), ['N123AB', 'G-ABCD', 'C-FABC', 'JA123A']);
  assert.deepEqual(registrationCandidates(['N 123 AB', 'N123AB'], '737'), ['N123AB']);
});
test('offers multiple candidates without guessing O/0 or I/1', () => {
  assert.deepEqual(registrationCandidates(['N12OAB N456CD']), ['N12OAB', 'N456CD']);
  assert.deepEqual(registrationCandidates(['AIRCRAFT', '12345', '2026-11-15', 'A320'], 'A320'), []);
});
test('offline selection reuses a matching cached or pending tailnumber and preserves its spelling', () => {
  const pending = { registration: 'C-FABC', aircraft: 'A320', local_id: 'local-1', sync_state: 'pending_create' };
  assert.deepEqual(scannedTailnumber([pending], 'c-fabc', 'A320'), { kind: 'existing', item: pending });
  assert.deepEqual(scannedTailnumber([pending], 'CFABC', 'A320'), { kind: 'existing', item: pending });
  assert.equal(scannedTailnumber([pending], 'C-FABC', '737').kind, 'other-aircraft');
  assert.equal(scannedTailnumber([{ ...pending, sync_state: 'pending_delete' }], 'C-FABC', 'A320').kind, 'new');
  assert.equal(scannedTailnumber([], 'N123AB', 'A320').registration, 'N123AB');
});
test('returns selection only to the originating flight and matching aircraft', () => {
  const state = { key: 'flights-stack', routes: [{ key: 'unfinished-flight' }, { key: 'new-tailnumber' }] };
  const target = { key: 'unfinished-flight', stackKey: 'flights-stack' };
  assert.deepEqual(flightReturnTarget(target, state), target);
  assert.equal(flightReturnTarget({ ...target, stackKey: 'other-stack' }, state), null);
  assert.equal(flightReturnTarget({ ...target, key: 'removed-flight' }, state), null);
  assert.equal(createdTailnumberSelection({ registration: 'N123AB', aircraft: 'A320' }, 'A320'), 'N123AB');
  assert.equal(createdTailnumberSelection({ registration: 'N123AB', aircraft: '737' }, 'A320'), null);
});
function capture(overrides = {}) {
  const events = [];
  const options = {
    aircraft: 'A320',
    requestPermission: async () => { events.push('permission'); return { granted: true }; },
    beforeCapture: async () => { events.push('draft'); },
    takePhoto: async () => { events.push('camera'); return { assets: [{ uri: 'file:///photo.jpg' }] }; },
    recognize: async uri => { events.push(['ocr', uri]); return ['N123AB']; },
    removePhoto: async uri => { events.push(['remove', uri]); },
    ...overrides,
  };
  return { events, run: () => scanRegistrationPhoto(options) };
}
test('persists the unfinished flight before camera capture and returns review data without saving anything', async () => {
  const { events, run } = capture();
  assert.deepEqual(await run(), { kind: 'review', candidates: ['N123AB'] });
  assert.deepEqual(events, ['permission', 'draft', 'camera', ['ocr', 'file:///photo.jpg'], ['remove', 'file:///photo.jpg']]);
});
test('denied permission and cancellation never change the form or invoke OCR', async () => {
  const denied = capture({ requestPermission: async () => ({ granted: false, canAskAgain: false }) });
  assert.deepEqual(await denied.run(), { kind: 'permission', canAskAgain: false });
  assert.deepEqual(denied.events, []);
  const cancelled = capture({ takePhoto: async () => ({ canceled: true }) });
  assert.deepEqual(await cancelled.run(), { kind: 'cancelled' });
  assert.deepEqual(cancelled.events, ['permission', 'draft']);
});
test('recognition failure cleans up the photo; draft failure prevents the camera opening', async () => {
  const failed = capture({ recognize: async () => { throw new Error('Unreadable image'); } });
  await assert.rejects(failed.run(), /Unreadable/);
  assert.deepEqual(failed.events.at(-1), ['remove', 'file:///photo.jpg']);
  const draft = capture({ beforeCapture: async () => { throw new Error('Draft could not be saved'); } });
  await assert.rejects(draft.run(), /Draft/);
  assert.deepEqual(draft.events, ['permission']);
});
test('cleanup failure does not discard results and remote images are rejected', async () => {
  assert.equal((await capture({ removePhoto: async () => { throw new Error('Cache'); } }).run()).kind, 'review');
  const remote = capture({ takePhoto: async () => ({ assets: [{ uri: 'https://example.com/photo.jpg' }] }) });
  await assert.rejects(remote.run(), /Camera image missing/);
  assert.deepEqual(remote.events, ['permission', 'draft']);
});
