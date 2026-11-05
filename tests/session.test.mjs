import test from 'node:test';
import assert from 'node:assert/strict';
import { createSessionStore } from '../app/auth/sessionStore.mjs';

function fixture(old = null, secureToken = null) {
  const state = { old, secureToken, failWrite: false, failDelete: false };
  const store = createSessionStore({
    secure: {
      async get() { return state.secureToken; },
      async set(key, value) { if (state.failWrite) throw new Error('locked'); state.secureToken = value; },
      async remove() { if (state.failDelete) throw new Error('locked'); state.secureToken = null; },
    },
    legacy: {
      async getItem() { return state.old; },
      async removeItem() { state.old = null; },
    },
  });
  return { state, store };
}
test('migrates existing token without changing offline partition identity', async () => {
  const { state, store } = fixture('old-token');
  await Promise.all([store.restore(), store.getToken()]);
  assert.equal(await store.getToken(), 'old-token');
  assert.equal(state.secureToken, 'old-token');
  assert.equal(state.old, null);
});
test('failed migration preserves legacy credential and can be retried', async () => {
  const { state, store } = fixture('old-token');
  state.failWrite = true;
  await assert.rejects(store.restore());
  assert.equal(state.old, 'old-token');
  assert.equal(store.snapshot().ready, false);
  state.failWrite = false;
  assert.equal((await store.restore()).token, 'old-token');
});
test('secure token takes precedence and plaintext is removed', async () => {
  const { state, store } = fixture('stale-token', 'secure-token');
  assert.equal((await store.restore()).token, 'secure-token');
  assert.equal(state.old, null);
});
test('logout removes credentials and notifies subscribers', async () => {
  const { state, store } = fixture(null, 'token-a');
  await store.restore();
  let observed;
  const unsubscribe = store.subscribe(value => { observed = value; });
  await store.signOut();
  assert.equal(observed.token, null);
  assert.equal(state.secureToken, null);
  unsubscribe();
});
test('late authentication failure cannot invalidate a newer login, even with the same token', async () => {
  const { store } = fixture(null, 'token-a');
  const old = await store.restore();
  await store.signOut();
  await store.signIn('token-a');
  assert.equal(await store.signOut(old, 'expired'), false);
  assert.equal(await store.getToken(), 'token-a');
});
test('current authentication failure expires session', async () => {
  const { store } = fixture(null, 'token-a');
  const expected = await store.restore();
  assert.equal(await store.signOut(expected, 'expired'), true);
  assert.equal(store.snapshot().reason, 'expired');
  assert.equal(await store.getToken(), null);
});
test('failed secure deletion does not claim logout succeeded', async () => {
  const { state, store } = fixture(null, 'token-a');
  await store.restore();
  state.failDelete = true;
  await assert.rejects(store.signOut());
  assert.equal(await store.getToken(), 'token-a');
  state.failDelete = false;
  await store.signOut();
  assert.equal(await store.getToken(), null);
});
test('rejects malformed sign-in responses without replacing credential', async () => {
  const { store } = fixture(null, 'token-a');
  await store.restore();
  for (const token of [null, undefined, '', ' ', 42]) await assert.rejects(store.signIn(token));
  assert.equal(await store.getToken(), 'token-a');
});

import axios from 'axios';
import { installSessionAuth } from '../app/auth/sessionAuth.mjs';
test('request auth uses secure credential; login requests omit it', async () => {
  const { store } = fixture(null, 'token-a');
  const api = axios.create({ adapter: async config => ({ data: {}, status: 200, config }) });
  installSessionAuth(api, store);
  assert.equal((await api.get('/flights')).config.headers.Authorization, 'Token token-a');
  assert.equal((await api.post('/login', {}, { skipAuth: true })).config.headers.Authorization, undefined);
  await assert.rejects(api.post('/sync', {}, { pinnedToken: 'token-b' }));
});
test('network errors and permission errors preserve offline session; 401 clears it', async () => {
  const { store } = fixture(null, 'token-a');
  let status;
  const api = axios.create({ adapter: async config => {
    const error = new Error('request failed');
    error.config = config;
    if (status) error.response = { status };
    throw error;
  } });
  installSessionAuth(api, store);
  for (status of [undefined, 403, 500]) {
    await assert.rejects(api.get('/flights'));
    assert.equal(await store.getToken(), 'token-a');
  }
  status = 401;
  await assert.rejects(api.get('/flights'));
  assert.equal(await store.getToken(), null);
});
test('late success and 401 from a previous login cannot affect the current account', async () => {
  for (const status of [200, 401]) {
    const { store } = fixture(null, 'token-a');
    let finish, started;
    const inFlight = new Promise(resolve => { started = resolve; });
    const api = axios.create({ adapter: config => new Promise((resolve, reject) => {
      finish = () => status === 200 ? resolve({ data: {}, config, status })
        : reject(Object.assign(new Error('invalid'), { config, response: { status } }));
      started();
    }) });
    installSessionAuth(api, store);
    const request = api.get('/flights');
    await inFlight;
    await store.signOut();
    await store.signIn('token-b');
    finish();
    await assert.rejects(request);
    assert.equal(await store.getToken(), 'token-b');
  }
});
