import test from 'node:test';
import assert from 'node:assert/strict';
import { registrationCandidates, registrationReview, plausibleRegistration, scannedTailnumber, createdTailnumberSelection, flightReturnTarget } from '../app/ocr/registrationCandidates.mjs';
import { scanRegistrationPhoto } from '../app/ocr/captureWorkflow.mjs';

test('extracts international registrations and excludes the selected aircraft code and labels', () => {
  assert.deepEqual(registrationCandidates(['AIRBUS A320', 'REG: N123AB', 'G–ABCD', 'C-FABC', 'JA123A'], 'A320'), ['N123AB', 'G-ABCD', 'C-FABC', 'JA123A']);
  assert.deepEqual(registrationCandidates(['N 123 AB', 'N123AB'], '737'), ['N123AB']);
});
test('rejects invalid N-number snippets without guessing O/0 or I/1', () => {
  assert.deepEqual(registrationCandidates(['N12OAB N456CD']), ['N456CD']);
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

test('shows recognition progress immediately after capture, before OCR returns', async () => {
  const events = [];
  const operation = capture({
    onRecognizing: () => events.push('reading'),
    recognize: async () => { assert.deepEqual(events, ['reading']); return ['N123AB']; },
  });
  assert.deepEqual(await operation.run(), { kind: 'review', candidates: ['N123AB'] });
});
test('does not show recognition progress for camera cancellation', async () => {
  let reading = false;
  const operation = capture({ takePhoto: async () => ({ canceled: true }), onRecognizing: () => { reading = true; } });
  assert.deepEqual(await operation.run(), { kind: 'cancelled' });
  assert.equal(reading, false);
});
test('stalled native recognition times out and removes the camera cache image', async () => {
  const operation = capture({ recognize: () => new Promise(() => {}), recognitionTimeoutMs: 5 });
  await assert.rejects(operation.run(), /Recognition timed out/);
  assert.deepEqual(operation.events.at(-1), ['remove', 'file:///photo.jpg']);
});

test('in-app Capture sends the photo straight to recognition without external confirmation', async () => {
  const { captureCameraPhoto } = await import('../app/ocr/cameraPhoto.mjs');
  const events = [];
  const camera = { takePictureAsync: async options => {
    events.push('capture');
    assert.equal(options.skipProcessing, false);
    assert.equal(options.base64, false);
    return { uri: 'file:///registration.jpg' };
  } };
  const operation = capture({
    takePhoto: async () => ({ assets: [await captureCameraPhoto(camera)] }),
    onRecognizing: () => events.push('reading'),
    recognize: async uri => { assert.equal(uri, 'file:///registration.jpg'); events.push('recognized'); return ['N123AB']; },
  });
  assert.deepEqual(await operation.run(), { kind: 'review', candidates: ['N123AB'] });
  assert.deepEqual(events, ['capture', 'reading', 'recognized']);
});
test('missing camera or unusable capture fails rather than waiting in a photo preview', async () => {
  const { captureCameraPhoto } = await import('../app/ocr/cameraPhoto.mjs');
  await assert.rejects(captureCameraPhoto(null), /Camera is not ready/);
  await assert.rejects(captureCameraPhoto({ takePictureAsync: async () => ({}) }), /No local camera image/);
});
test('review distinguishes recognized ordinary text from no text', async () => {
  assert.deepEqual(await capture({ recognize: async () => ['Hello world'] }).run(), { kind: 'review', candidates: [], recognizedLines: ['Hello world'] });
  assert.deepEqual(await capture({ recognize: async () => [] }).run(), { kind: 'review', candidates: [], recognizedLines: [] });
});

test('a stalled in-app camera fails visibly instead of staying on an image indefinitely', async () => {
  const { captureCameraPhoto } = await import('../app/ocr/cameraPhoto.mjs');
  await assert.rejects(captureCameraPhoto({ takePictureAsync: () => new Promise(() => {}) }, 5), /Capture timed out/);
});

test('filters the screenshot noise and keeps only plausible registration text', () => {
  assert.deepEqual(registrationCandidates(['NI23456', 'N123456', 'ON123456', '12DEGREE', 'N12345']), ['N12345']);
  for (const value of ['N12345', 'N1234Z', 'N123AZ', 'N123AB', 'G-ABCD', 'C-FABC', '9H-ABC', 'JA123A']) assert.equal(plausibleRegistration(value), true, value);
  for (const value of ['N123456', 'NI23456', 'N0123', 'N123I', 'N123O', 'ON123456', '12DEGREE', 'A320']) assert.equal(plausibleRegistration(value), false, value);
});
test('one editable review value is prefilled only when the cropped OCR has one plausible result', () => {
  assert.equal(registrationReview(registrationCandidates(['N12345', 'N12345'])), 'N12345');
  assert.equal(registrationReview(registrationCandidates(['N12345 N23456'])), '');
  assert.equal(registrationReview([]), '');
  // Do not invent a missing digit or silently change a plausible read.
  assert.equal(registrationReview(registrationCandidates(['N23456'])), 'N23456');
});
test('recognition receives only the prepared guide crop and cleans up both files', async () => {
  const operation = capture({ preparePhoto: async photo => {
    assert.equal(photo.uri, 'file:///photo.jpg');
    return { uri: 'file:///guide-crop.jpg' };
  } });
  assert.equal((await operation.run()).kind, 'review');
  assert.deepEqual(operation.events.slice(-3), [['ocr', 'file:///guide-crop.jpg'], ['remove', 'file:///guide-crop.jpg'], ['remove', 'file:///photo.jpg']]);
});
test('failed cropping never falls back to recognizing the full image', async () => {
  const operation = capture({ preparePhoto: async () => { throw new Error('Crop unavailable'); } });
  await assert.rejects(operation.run(), /Crop unavailable/);
  assert.deepEqual(operation.events, ['permission', 'draft', 'camera', ['remove', 'file:///photo.jpg']]);
});

 test('field-test registrations survive OCR spacing without competing truncated fragments', () => {
  for (const expected of ['N8541F', 'N3388T', 'N6886U', 'N1287P', 'SP-LDG']) {
    for (const text of [expected, expected.slice(0, -1) + ' ' + expected.slice(-1)]) {
      assert.deepEqual(registrationCandidates([text]), [expected], text);
      assert.equal(registrationReview(registrationCandidates([text])), expected);
    }
  }
  assert.deepEqual(registrationCandidates(['N3388 T N1287 P']), ['N3388', 'N1287']);
  assert.equal(registrationReview(registrationCandidates(['N3388T', 'N1287P'])), '');
});

test('image passes require strong agreement and keep multiple registrations ambiguous', async () => {
  const { registrationPasses } = await import('../app/ocr/registrationCandidates.mjs');
  assert.deepEqual(registrationPasses([['N3388 T'], ['N3388T'], ['N3388T'], ['N338BT']]), ['N3388T']);
  assert.equal(registrationReview(registrationPasses([['N3388T'], ['N338BT']])), '');
  assert.equal(registrationReview(registrationPasses([['N6886U', 'N201XH'], ['N6886U', 'N201XH']])), '');
  assert.equal(registrationReview(registrationPasses([['N6886U', 'N201XH'], ['N6886U'], ['N6886U'], ['N6886U']])), '');
  assert.deepEqual(registrationPasses([['NI287P'], ['N854IF'], ['Hello world']]), []);
});
test('enhanced scans retain just the cropped photo for adjustment, then caller owns cleanup', async () => {
  const operation = capture({
    preparePhoto: async () => ({ uri: 'file:///guide.jpg', width: 1200, height: 300 }),
    retainPreparedPhoto: true,
    recognize: async () => [['N3388 T'], ['N3388T']],
  });
  const result = await operation.run();
  assert.deepEqual(result.candidates, ['N3388T']);
  assert.equal(result.photo.uri, 'file:///guide.jpg');
  assert.deepEqual(operation.events.filter(item => Array.isArray(item) && item[0] === 'remove'), [['remove', 'file:///photo.jpg']]);
});
test('failed enhanced scans still remove the cropped and original image', async () => {
  const operation = capture({ preparePhoto: async () => ({ uri: 'file:///guide.jpg' }), retainPreparedPhoto: true, recognize: async () => { throw new Error('OCR failed'); } });
  await assert.rejects(operation.run(), /OCR failed/);
  assert.deepEqual(operation.events.slice(-2), [['remove', 'file:///guide.jpg'], ['remove', 'file:///photo.jpg']]);
});
test('adjustable crop requires a usable, non-crossing quadrilateral inside the guide image', async () => {
  const { validCropCorners, DEFAULT_CROP_CORNERS } = await import('../app/ocr/cropQuad.mjs');
  assert.equal(validCropCorners(DEFAULT_CROP_CORNERS), true);
  assert.equal(validCropCorners([[0.1, 0.1], [0.9, 0.25], [0.8, 0.7], [0.2, 0.9]]), true);
  assert.equal(validCropCorners([[0,0], [1,1], [1,0], [0,1]]), false);
  assert.equal(validCropCorners([[0,0], [1,0], [1,0.001], [0,0.001]]), false);
  assert.equal(validCropCorners([[-0.1,0], [1,0], [1,1], [0,1]]), false);
  assert.equal(validCropCorners([[NaN,0], [1,0], [1,1], [0,1]]), false);
});

test('possible readings disclose digit look-alikes without inventing missing characters', async () => {
  const { possibleNNumber, registrationScanReview } = await import('../app/ocr/registrationCandidates.mjs');
  assert.equal(possibleNNumber('N854IF'), 'N8541F');
  assert.equal(possibleNNumber('NI287P'), 'N1287P');
  assert.equal(possibleNNumber('NI63ME'), 'N163ME');
  assert.equal(possibleNNumber('N33B8T'), 'N3388T');
  assert.equal(possibleNNumber('N338BT'), null); // Already valid; B must stay B.
  assert.equal(possibleNNumber('N854'), null); // Never add missing 1F.
  assert.equal(possibleNNumber('NIG3ME'), null); // Do not reinterpret arbitrary letters.
  assert.equal(possibleNNumber('VI63ME'), null); // Do not invent the N prefix.
  assert.deepEqual(registrationScanReview([['NI287P'], ['NI287P']]), { candidates: ['N1287P'], needsVerification: true });
  assert.deepEqual(registrationScanReview([['N6886U']]), { candidates: ['N6886U'], needsVerification: false });
  assert.equal(registrationReview(registrationScanReview([['NI287P'], ['N854IF']]).candidates), '');
});

test('native low-confidence readings remain explicitly marked for review', async () => {
  const operation = capture({ recognize: async () => ({ passes: [['N59LW'], ['N59LW']], lowConfidence: true }) });
  const result = await operation.run();
  assert.deepEqual(result.candidates, ['N59LW']);
  assert.equal(result.lowConfidence, true);
});

test('invalid scene-model output cannot suppress a valid legacy reading of the same guide', async () => {
  const { recognizeRegistrationImage } = await import('../app/ocr/recognizeImage.mjs');
  const { registrationScanReview } = await import('../app/ocr/registrationCandidates.mjs');
  let fallbackCalls = 0;
  const result = await recognizeRegistrationImage({ enhanced: async () => ({ passes: [['NRI']] }), legacy: async () => { fallbackCalls++; return ['N854IF']; } });
  assert.equal(fallbackCalls, 1);
  assert.deepEqual(registrationScanReview(result.passes).candidates, ['N8541F']);
  assert.equal(result.lowConfidence, true);
});
test('a usable scene-model reading does not get outvoted by legacy OCR', async () => {
  const { recognizeRegistrationImage } = await import('../app/ocr/recognizeImage.mjs');
  const primary = { passes: [['N163ME']] };
  assert.equal(await recognizeRegistrationImage({ enhanced: async () => primary, legacy: async () => { throw new Error('Must not run'); } }), primary);
});
test('adjusted scans never fall back to pixels outside the selected quadrilateral', async () => {
  const { recognizeRegistrationImage } = await import('../app/ocr/recognizeImage.mjs');
  const corners = [[0.1,0.1],[0.9,0.1],[0.9,0.9],[0.1,0.9]];
  const primary = { passes: [['NRI']] };
  const legacy = async () => { throw new Error('Outside adjusted crop'); };
  assert.equal(await recognizeRegistrationImage({ enhanced: async () => primary, legacy, corners }), primary);
  await assert.rejects(recognizeRegistrationImage({ enhanced: async () => { throw new Error('Adjusted scan failed'); }, legacy, corners }), /Adjusted scan failed/);
});

test('look-alike repair keeps legitimate L suffixes when O is misread in the numeric prefix', async () => {
  const { possibleNNumber, registrationScanReview } = await import('../app/ocr/registrationCandidates.mjs');
  assert.equal(possibleNNumber('N6OOLR'), 'N600LR');
  assert.equal(possibleNNumber('N60OLR'), 'N600LR');
  assert.equal(possibleNNumber('NL287P'), 'N1287P');
  assert.equal(possibleNNumber('N600LR'), null);
  assert.deepEqual(registrationScanReview([['N6OOLR', 'N60OLR']]), {
    candidates: ['N600LR'], needsVerification: true,
  });
});
