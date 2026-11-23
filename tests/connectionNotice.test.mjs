import test from 'node:test';
import assert from 'node:assert/strict';
import { connectionNotice, syncConnectionFailure } from '../app/api/connectionNotice.mjs';

test('routine connection messages close after one second', () => {
  assert.deepEqual(connectionNotice(true), { message: 'Connected', error: false, durationMs: 1000 });
  assert.deepEqual(connectionNotice(false), { message: 'Not Connected', error: false, durationMs: 1000 });
});
test('errors remain visible instead of receiving an automatic close timer', () => {
  const error = 'Could not open logbook.\nPull down to retry.';
  assert.deepEqual(connectionNotice(false, error), { message: error, error: true, durationMs: null });
});
test('normal offline and unreachable-server conditions do not become persistent errors', () => {
  for (const error of [new Error('Offline'), { isAxiosError: true, code: 'ERR_NETWORK' }, { code: 'ECONNABORTED' }]) {
    assert.deepEqual(syncConnectionFailure(error), { connected: false, error: '' });
  }
});
test('an HTTP failure proves server contact but still needs attention', () => {
  assert.equal(syncConnectionFailure({ response: { status: 500 } }).connected, true);
  assert.match(syncConnectionFailure({ response: { status: 500 } }).error, /retry/);
  assert.equal(syncConnectionFailure({ response: { status: 401 } }).error, 'Sign in again to sync.');
  assert.match(syncConnectionFailure({ response: { status: 404 } }).error, /Sync is unavailable/);
});
test('unexpected local errors are not disguised as normal offline use', () => {
  assert.equal(connectionNotice(false, syncConnectionFailure(new Error('Storage failed')).error).durationMs, null);
});

test('airplane mode replaces even a previous error with a brief acknowledgment', () => {
  assert.deepEqual(connectionNotice(false, 'Sync could not finish.', true), {
    message: 'Airplane Mode', error: false, durationMs: 1000,
  });
});
