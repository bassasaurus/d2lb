import test from 'node:test';
import assert from 'node:assert/strict';
import { replayConfiguration, shouldCaptureReplay } from '../app/monitoring/replay.mjs';
import { safeEvent } from '../app/monitoring/policy.mjs';
const errorEvent = () => ({ level: 'error', exception: { values: [{ type: 'Error', value: 'Mobile sync failed' }] } });

test('release replay is error-only with text, image, and vector masking disabled', () => {
  let options;
  const integration = {};
  const config = replayConfiguration({ mobileReplayIntegration: value => { options = value; return integration; } }, true);
  assert.equal(config.replaysSessionSampleRate, 0);
  assert.equal(config.replaysOnErrorSampleRate, 1);
  assert.deepEqual(config.integrations, [integration]);
  assert.equal(options.maskAllText, false);
  assert.equal(options.maskAllImages, false);
  assert.equal(options.maskAllVectors, false);
  assert.equal(options.networkCaptureBodies, false);
  assert.deepEqual(options.networkDetailAllowUrls, []);
  assert.equal(options.captureSurfaceViews, false);
  assert.equal(options.beforeErrorSampling, shouldCaptureReplay);
});

test('development and Expo Go do not initialize native replay', () => {
  const config = replayConfiguration({ mobileReplayIntegration: () => assert.fail('should not initialize') }, false);
  assert.equal(config.replaysOnErrorSampleRate, 0);
  assert.equal(config.replaysSessionSampleRate, 0);
  assert.deepEqual(config.integrations, []);
});

test('unexpected handled and unhandled exceptions qualify for replay', () => {
  assert.equal(shouldCaptureReplay(errorEvent()), true);
  const event = errorEvent();
  event.level = 'fatal';
  event.exception.values[0].mechanism = { handled: false };
  assert.equal(shouldCaptureReplay(event), true);
  assert.equal(shouldCaptureReplay(errorEvent(), { originalException: { response: { status: 500 } } }), true);
});

test('normal offline, validation, conflict and support reports do not trigger replay', () => {
  for (const error of [{ code: 'ERR_NETWORK' }, { code: 'ECONNABORTED' }, new Error('Network request failed'),
    ...[400, 401, 403, 404, 408, 409, 422, 429].map(status => ({ response: { status } }))]) {
    assert.equal(shouldCaptureReplay(errorEvent(), { originalException: error }), false);
  }
  assert.equal(shouldCaptureReplay({ ...errorEvent(), contexts: { diagnostic: { http_status: 409 } } }), false);
  assert.equal(shouldCaptureReplay({ level: 'info', message: 'Support requested', tags: { feature: 'support' } }), false);
  assert.equal(shouldCaptureReplay({ ...errorEvent(), tags: { feature: 'support' } }), false);
  assert.equal(shouldCaptureReplay({ level: 'error', message: 'message without exception' }), false);
});

test('event scrubbing keeps the replay link without allowing extra replay context', () => {
  const id = 'a'.repeat(32);
  const clean = safeEvent({ ...errorEvent(), contexts: { replay: { replay_id: id, secret: 'private' } } });
  assert.deepEqual(clean.contexts.replay, { replay_id: id });
  assert.equal(JSON.stringify(clean).includes('private'), false);
  assert.equal(safeEvent({ ...errorEvent(), contexts: { replay: { replay_id: 'not-an-id' } } }).contexts.replay, undefined);
});
