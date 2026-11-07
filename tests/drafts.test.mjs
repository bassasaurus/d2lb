import test from 'node:test';
import assert from 'node:assert/strict';
import { createDraftStore, draftKey, fingerprint } from '../app/drafts/draftStore.mjs';
const memory = () => {
  const data = new Map();
  return { data, async getItem(key) { return data.get(key) || null; }, async setItem(key, value) { data.set(key, value); }, async removeItem(key) { data.delete(key); } };
};
test('draft values and timestamp survive restarting the store, without changing the baseline', async () => {
  const storage = memory();
  const key = draftKey('account-1', 'flight', 'new');
  const baseline = { date: '', route: '', approaches: [{ approach_type: '', number: '' }] };
  const values = { ...baseline, route: 'IAH-LAX', remarks: 'Unfinished', approaches: [{ approach_type: 'ILS', number: '2' }] };
  await createDraftStore(storage, () => '2026-11-05T14:32:00Z').save(key, baseline, values);
  const recovered = await createDraftStore(storage).load(key);
  assert.deepEqual(recovered.values, values);
  assert.equal(recovered.updatedAt, '2026-11-05T14:32:00Z');
  assert.equal(recovered.baseline, fingerprint(baseline));
});
test('drafts are isolated by account, form type and record', async () => {
  const store = createDraftStore(memory());
  await store.save(draftKey('a', 'flight', 'new'), {}, { route: 'IAH' });
  for (const [scope, kind, record] of [['b', 'flight', 'new'], ['a', 'aircraft', 'new'], ['a', 'flight', 'server:1']]) {
    assert.equal(await store.load(draftKey(scope, kind, record)), null);
  }
  assert.throws(() => draftKey('', 'flight', 'new'));
  assert.throws(() => draftKey('a', 'password', 'new'));
});
test('queued autosaves cannot recreate a successfully completed or discarded draft', async () => {
  const store = createDraftStore(memory());
  const key = draftKey('a', 'aircraft', 'new');
  await Promise.all([store.save(key, {}, { aircraft_type: 'C172' }), store.save(key, {}, { aircraft_type: 'C182' }), store.remove(key)]);
  assert.equal(await store.load(key), null);
});
test('a pending write captures values immediately, not later mutated form values', async () => {
  const store = createDraftStore(memory());
  const values = { route: 'IAH', approaches: [{ number: '1' }] };
  const writing = store.save('key', {}, values);
  values.route = 'LAX';
  values.approaches[0].number = '2';
  await writing;
  assert.deepEqual((await store.load('key')).values, { route: 'IAH', approaches: [{ number: '1' }] });
});
test('storage failures are surfaced and later saves can recover', async () => {
  const storage = memory();
  const store = createDraftStore(storage);
  const set = storage.setItem;
  storage.setItem = async () => { throw new Error('disk full'); };
  await assert.rejects(store.save('key', {}, { route: 'IAH' }));
  storage.setItem = set;
  await store.save('key', {}, { route: 'LAX' });
  assert.equal((await store.load('key')).values.route, 'LAX');
  storage.removeItem = async () => { throw new Error('locked'); };
  await assert.rejects(store.remove('key'));
  assert.equal((await store.load('key')).values.route, 'LAX');
});
test('corrupt and unsupported payloads fail visibly and are retained for explicit discard', async () => {
  const storage = memory();
  const store = createDraftStore(storage);
  for (const raw of ['{broken', '{"version":99}', '{"version":1,"baseline":"{}","values":{},"updatedAt":"bad"}']) {
    storage.data.set('key', raw);
    await assert.rejects(store.load('key'));
    assert.equal(storage.data.get('key'), raw);
  }
  await store.remove('key');
  assert.equal(await store.load('key'), null);
});
test('baseline comparison ignores object key ordering but detects edited values and revisions', () => {
  assert.equal(fingerprint({ revision: 'a', route: 'IAH' }), fingerprint({ route: 'IAH', revision: 'a' }));
  assert.notEqual(fingerprint({ revision: 'a' }), fingerprint({ revision: 'b' }));
});

test('profile drafts are isolated by account and account/medical form', async () => {
  const storage = memory();
  const key = draftKey('owner', 'profile-account', 'new');
  await createDraftStore(storage).save(key, {}, { first_name: 'Sam' });
  assert.deepEqual((await createDraftStore(storage).load(key)).values, { first_name: 'Sam' });
  assert.equal(await createDraftStore(storage).load(draftKey('other', 'profile-account', 'new')), null);
  assert.equal(await createDraftStore(storage).load(draftKey('owner', 'profile-medical', 'new')), null);
});
