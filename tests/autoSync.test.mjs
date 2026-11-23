import test from 'node:test';
import assert from 'node:assert/strict';
import { canAttemptApiSync, createAutoSync, internetAvailable } from '../app/api/autoSync.mjs';
const online = { isConnected: true, isInternetReachable: true };
test('local development sync can reach its API without an external internet probe', async () => {
  const offline = { isConnected: false, isInternetReachable: false };
  for (const origin of ['http://127.0.0.1:8000', 'http://localhost:8000', 'http://10.0.2.2:8000', 'http://[::1]:8000']) {
    assert.equal(canAttemptApiSync(offline, origin), true);
  }
  assert.equal(canAttemptApiSync(offline, 'https://direct2logbook.com'), false);
  assert.equal(canAttemptApiSync(offline, 'https://localhost.evil.example'), false);
  assert.equal(canAttemptApiSync(offline, 'not a URL'), false);
  assert.equal(canAttemptApiSync(online, 'https://direct2logbook.com'), true);
  let calls = 0;
  const worker = createAutoSync({isActive: () => true, hasPending: async () => calls === 0,
    isOnline: state => canAttemptApiSync(state, 'http://127.0.0.1:8000'), sync: async () => calls++});
  await worker.network(offline);
  assert.equal(calls, 1);
});

test('LAN development servers require a network connection but not internet reachability', () => {
  const lan = { isConnected: true, isInternetReachable: false };
  for (const origin of ['http://192.168.1.4:8000', 'http://10.1.2.3:8000', 'http://172.16.0.1:8000']) {
    assert.equal(canAttemptApiSync(lan, origin), true);
    assert.equal(canAttemptApiSync({...lan, isConnected: false}, origin), false);
  }
  assert.equal(canAttemptApiSync(lan, 'http://172.32.0.1:8000'), false);
  assert.equal(canAttemptApiSync(lan, 'https://direct2logbook.com'), false);
});
test('airplane mode reconnect waits for internet, not merely Wi-Fi connection', async () => {
  let calls = 0;
  let pending = true;
  const worker = createAutoSync({ isActive: () => true, hasPending: async () => pending,
    sync: async () => { calls++; pending = false; } });
  await worker.network({ isConnected: false, isInternetReachable: false });
  await worker.network({ isConnected: true, isInternetReachable: null });
  await worker.network({ isConnected: true, isInternetReachable: false });
  assert.equal(calls, 0);
  await worker.network(online);
  assert.equal(calls, 1);
  await worker.network(online);
  await worker.request();
  assert.equal(calls, 1);
  assert.equal(internetAvailable({ isConnected: null, isInternetReachable: true }), false);
});
test('background reconnect waits until foreground and disposed sessions never sync', async () => {
  let active = false;
  let calls = 0;
  const worker = createAutoSync({ isActive: () => active, hasPending: async () => true, sync: async () => { calls++; } });
  await worker.network(online);
  assert.equal(calls, 0);
  active = true;
  await worker.request();
  assert.equal(calls, 1);
  worker.dispose();
  await worker.request();
  assert.equal(calls, 1);
});
test('overlapping network events share one upload and failures remain retryable', async () => {
  let calls = 0;
  let complete = 0;
  let release;
  const worker = createAutoSync({ isActive: () => true, hasPending: async () => calls === 0,
    sync: async () => { calls++; await new Promise(resolve => { release = resolve; }); }, onComplete: () => complete++ });
  const first = worker.network(online);
  await new Promise(resolve => setImmediate(resolve));
  const second = worker.request();
  release();
  await Promise.all([first, second]);
  assert.equal(calls, 1);
  assert.equal(complete, 1);
  let attempts = 0;
  const retry = createAutoSync({ isActive: () => true, hasPending: async () => true,
    sync: async () => { attempts++; throw new Error('network lost'); }, onComplete: () => assert.fail('Not confirmed') });
  await retry.network(online);
  await retry.request();
  assert.equal(attempts, 2);
});

test('the screen receives the original sync failure so offline and action-required errors stay distinct', async () => {
  const failure = { response: { status: 500 } };
  let received;
  const worker = createAutoSync({ isActive: () => true, hasPending: async () => true,
    sync: async () => { throw failure; }, onError: error => { received = error; } });
  await worker.network(online);
  assert.equal(received, failure);
});
