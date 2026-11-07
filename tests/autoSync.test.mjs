import test from 'node:test';
import assert from 'node:assert/strict';
import { createAutoSync, internetAvailable } from '../app/api/autoSync.mjs';
const online = { isConnected: true, isInternetReachable: true };
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
