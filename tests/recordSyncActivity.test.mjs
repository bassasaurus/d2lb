import test from 'node:test';
import assert from 'node:assert/strict';
import { createRecordSyncActivity, recordSyncActivity, recordSyncPresentation } from '../app/api/recordSyncActivity.mjs';
import { drainFlightQueue } from '../app/api/syncEngine.mjs';

test('upload activity belongs to the exact account and record namespace', () => {
  const activity = createRecordSyncActivity();
  const finish = activity.start('owner:tailnumbers', 'server:1');
  assert.equal(activity.isActive('owner:tailnumbers', 'server:1'), true);
  assert.equal(activity.isActive('owner', 'server:1'), false);
  assert.equal(activity.isActive('other:tailnumbers', 'server:1'), false);
  finish();
  assert.equal(activity.isActive('owner:tailnumbers', 'server:1'), false);
});

test('overlapping uploads stay active until both finish and observers cannot break sync', () => {
  const activity = createRecordSyncActivity();
  let notifications = 0;
  const unsubscribe = activity.subscribe(() => notifications++);
  activity.subscribe(() => { throw new Error('UI error'); });
  const first = activity.start('owner', 'flight');
  const second = activity.start('owner', 'flight');
  first();
  first();
  assert.equal(activity.isActive('owner', 'flight'), true);
  second();
  assert.equal(activity.isActive('owner', 'flight'), false);
  assert.equal(notifications, 4);
  unsubscribe();
  activity.start('owner', 'another')();
  assert.equal(notifications, 4);
});

test('queue worker announces the actual upload and clears activity on success and failure', async () => {
  for (const failed of [false, true]) {
    const scope = `activity-test:${failed}`;
    const operation = {local_id: 'tail', request: '{}'};
    let claimed = false;
    const store = {
      nextOperation: async () => { if (claimed) return null; claimed = true; return operation; },
      acknowledge: async () => {}, failOperation: async () => {},
    };
    const run = drainFlightQueue({store, scope, uuid: () => 'op', isCurrent: async () => true,
      send: async () => {
        assert.equal(recordSyncActivity.isActive(scope, 'tail'), true);
        if (failed) throw new Error('Offline');
        return {flight: {id: 1}};
      },
    });
    if (failed) await assert.rejects(run, /Offline/);
    else assert.equal(await run, 1);
    assert.equal(recordSyncActivity.isActive(scope, 'tail'), false);
  }
});

test('acknowledgment stays green through stale pending and refreshed synced rows with one completion key', () => {
  const activity = createRecordSyncActivity();
  const pending = { sync_state: 'pending_create', sync_generation: 0 };
  const finish = activity.start('green', 'flight', { generation: 0, operation_id: 'upload-1' });
  assert.equal(recordSyncPresentation(pending, activity.snapshot('green', 'flight')).sending, true);
  finish('synced');
  const acknowledged = recordSyncPresentation(pending, activity.snapshot('green', 'flight'));
  assert.equal(acknowledged.synced, true);
  assert.equal(acknowledged.completionKey, 'upload-1');
  const refreshed = recordSyncPresentation({ ...pending, sync_state: 'synced' }, activity.snapshot('green', 'flight'));
  assert.deepEqual(refreshed, acknowledged);
  const newEdit = recordSyncPresentation({ sync_state: 'pending_update', sync_generation: 1 }, activity.snapshot('green', 'flight'));
  assert.equal(newEdit.synced, false);
  assert.equal(newEdit.completionKey, null);
});

test('failed upload cannot inherit a previous successful green state', () => {
  const activity = createRecordSyncActivity();
  activity.start('failure', 'flight', { generation: 0, operation_id: 'first' })('synced');
  activity.start('failure', 'flight', { generation: 1, operation_id: 'next' })('failed');
  const result = recordSyncPresentation({ sync_generation: 1, sync_state: 'pending_update' }, activity.snapshot('failure', 'flight'));
  assert.equal(result.failed, true);
  assert.equal(result.synced, false);
  assert.equal(result.completionKey, null);
  assert.equal(activity.snapshot('other', 'flight'), undefined);
});
