import test from 'node:test';
import assert from 'node:assert/strict';
import { getApiBaseURL } from '../app/api/baseURL.mjs';

test('Android emulator reaches the Mac through its host alias', () => {
  assert.equal(getApiBaseURL({platform:'android',isDevice:false}), 'http://10.0.2.2:8000');
});
test('iOS simulator uses the local Django server', () => {
  assert.equal(getApiBaseURL({platform:'ios',isDevice:false}), 'http://127.0.0.1:8000');
});
test('physical devices use the production HTTPS origin', () => {
  assert.equal(getApiBaseURL({platform:'ios',isDevice:true}), 'https://direct2logbook.com');
});
test('explicit development origin overrides device defaults', () => {
  assert.equal(getApiBaseURL({platform:'android',isDevice:false,override:' http://192.168.1.20:8000/ '}), 'http://192.168.1.20:8000');
});
