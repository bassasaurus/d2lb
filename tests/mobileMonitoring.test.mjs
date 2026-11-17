import test from 'node:test';
import assert from 'node:assert/strict';
import { createMonitoring, monitoredStorage } from '../app/monitoring/core.mjs';
import { expectedFailure, safeDetails, safeEvent, safeBreadcrumb } from '../app/monitoring/policy.mjs';
import { supportEmailURL } from '../app/settings/supportDetails.mjs';
import { drainFlightQueue } from '../app/api/syncEngine.mjs';

function mockMonitor(enabled = true) {
  const events = [], crumbs = [], users = [];
  const sdk = { addBreadcrumb: x => crumbs.push(x), captureException: (error, context) => { events.push({ error, context }); return 'diagnostic-id'; },
    captureEvent: event => { events.push(event); return 'support-id'; }, setUser: value => users.push(value), getCurrentScope: () => ({ clearBreadcrumbs: () => crumbs.splice(0) }) };
  return { ...createMonitoring({ sdk, enabled }), events, crumbs, users };
}

test('normal offline, timeout, validation, auth and conflict cases generate no error alerts', () => {
  const monitor = mockMonitor();
  for (const error of [new Error('Network request failed'), new Error('Offline'), { code: 'ERR_NETWORK' }, { code: 'ECONNABORTED' },
    { name: 'AbortError' }, ...[400, 401, 403, 404, 408, 409, 422, 429].map(status => ({ response: { status } })),
    new Error('Account changed during sync.'), new Error('Aircraft must upload before this tailnumber.')]) {
    assert.equal(expectedFailure(error), true);
    assert.equal(monitor.report(error, { resource: 'flight', action: 'sync' }), null);
  }
  assert.equal(monitor.events.length, 0);
});

test('unexpected server failures include PKs but never response payloads or original messages', () => {
  const monitor = mockMonitor();
  const error = Object.assign(new Error('Bearer password-secret SQL remarks'), { response: { status: 500, data: { signature: 'private-image' } } });
  assert.equal(monitor.report(error, { resource: 'flight', action: 'sync', record_id: 148, account_id: 7, request: 'private-flight' }), 'diagnostic-id');
  const report = monitor.events[0];
  assert.deepEqual(report.context.contexts.diagnostic, { resource: 'flight', action: 'sync', record_id: 148, account_id: 7, http_status: 500 });
  assert.equal(report.error.message, 'Mobile sync failed');
  assert.equal(JSON.stringify(report).includes('private'), false);
  monitor.report(error, { resource: 'flight' });
  assert.equal(monitor.events.length, 1);
  monitor.report({ response: { status: 500 } }, { resource: 'flight', action: 'sync', record_id: 148 });
  assert.equal(monitor.events.length, 1);
  monitor.report({ response: { status: 500 } }, { resource: 'flight', action: 'sync', record_id: 149 });
  assert.equal(monitor.events.length, 2);
});

test('SDK failures cannot prevent the storage operation error reaching the caller', async () => {
  const original = new Error('SQLite disk full with private SQL');
  const driver = { async runAsync() { throw original; }, async getFirstAsync() { return { count: 1 }; } };
  const records = [];
  const wrapped = monitoredStorage(driver, (error, details) => { records.push(details); throw new Error('Sentry unavailable'); });
  await assert.rejects(wrapped.runAsync('private SQL', 'secret value'), error => error === original);
  assert.deepEqual(records, [{ resource: 'database', action: 'write' }]);
  assert.deepEqual(await wrapped.getFirstAsync(), { count: 1 });
});

test('event filtering removes credentials, payloads, images and automatic UI/network breadcrumbs', () => {
  const event = { event_id: '123', release: 'app@1+2', user: { id: '7', email: 'private@example.com' }, request: { headers: { Authorization: 'secret' } },
    extra: { flight: 'private' }, contexts: { diagnostic: { resource: 'flight', record_id: 148, password: 'private' }, custom: { signature: 'private' } },
    tags: { app_build: '28', credential: 'private' }, exception: { values: [{ type: 'Error', value: 'password private', stacktrace: { frames: [{ filename: 'app.js', lineno: 4, vars: { password: 'private' }, context_line: 'private' }] } }] },
    breadcrumbs: [{ category: 'http', data: { url: 'private' } }, { category: 'ui.click', message: 'private' }, { category: 'app.diagnostic', data: { resource: 'flight', phase: 'synced', record_id: 148, remarks: 'private' } }] };
  const clean = safeEvent(event);
  assert.equal(JSON.stringify(clean).includes('private'), false);
  assert.deepEqual(clean.user, { id: '7' });
  assert.equal(clean.exception.values[0].stacktrace.frames[0].lineno, 4);
  assert.equal(clean.breadcrumbs.length, 1);
  assert.equal(clean.contexts.diagnostic.record_id, 148);
  assert.equal(safeBreadcrumb({ category: 'http' }), null);
  assert.equal(safeEvent(event, { originalException: { code: 'ERR_NETWORK' } }), null);
});

test('account context is cleared at session boundaries and development creates no events', () => {
  const monitor = mockMonitor();
  monitor.account(7);
  monitor.breadcrumb({ resource: 'flight', phase: 'saved' });
  monitor.reset();
  assert.deepEqual(monitor.users, [{ id: '7' }, null]);
  assert.equal(monitor.crumbs.length, 0);
  const development = mockMonitor(false);
  assert.equal(development.report(new Error('Unexpected')), null);
  assert.equal(development.supportReference(), null);
  assert.equal(development.events.length, 0);
});

test('Contact Support creates informational reference and composes an email without sending it', () => {
  const monitor = mockMonitor();
  const reference = monitor.supportReference();
  assert.deepEqual(monitor.events[0], { message: 'Support requested', level: 'info', tags: { feature: 'support' } });
  const url = supportEmailURL({ version: '0.10.1 (Build 28)', platform: 'android', osVersion: 36, reference });
  assert.ok(url.startsWith('mailto:support@direct2logbook.com?'));
  const body = new URL(url).searchParams.get('body');
  assert.match(body, /Diagnostic reference: support-id/);
  assert.match(body, /Version: 0.10.1 \(Build 28\)/);
  assert.match(body, /Device OS: android 36/);
  assert.deepEqual(safeDetails({ resource: 'flight', record_id: 'SQL private', local_id: 'sensitive-route', remarks: 'private' }), { resource: 'flight' });
});

test('sync instrumentation tracks the actual server PK and observers cannot alter acknowledgments', async () => {
  const events = []; let acknowledged = 0; let read = false;
  const store = { nextOperation: async () => read ? null : (read = true, { local_id: 'server:148', attempts: 1, request: JSON.stringify({ action: 'update', flight_id: 148, data: { remarks: 'private' } }) }),
    acknowledge: async () => { acknowledged++; }, failOperation: async () => assert.fail('successful sync must not fail') };
  const result = await drainFlightQueue({ store, scope: 'account', uuid: () => 'operation', isCurrent: async () => true,
    send: async () => ({ flight: { id: 148 } }), onSyncEvent: event => { events.push(safeDetails(event)); throw new Error('observer failed'); } });
  assert.equal(result, 1); assert.equal(acknowledged, 1);
  assert.deepEqual(events.map(x => x.phase), ['started', 'synced']);
  assert.equal(events[1].record_id, 148);
  assert.equal(events[0].attempt, 2);
  assert.equal(JSON.stringify(events).includes('private'), false);
});

test('validation thrown inside a storage transaction is not reported as a database failure', async () => {
  const reports = [];
  const validation = new Error('This aircraft type already exists in your account.');
  const db = { async withExclusiveTransactionAsync(callback) { return callback({}); } };
  const wrapped = monitoredStorage(db, (...args) => reports.push(args));
  await assert.rejects(wrapped.withExclusiveTransactionAsync(async () => { throw validation; }), error => error === validation);
  assert.equal(reports.length, 0);
});

test('driver failures inside transactions are observed once with no SQL or arguments', async () => {
  const reports = [];
  const diskError = new Error('disk full');
  const tx = { async runAsync() { throw diskError; } };
  const db = { async withExclusiveTransactionAsync(callback) { return callback(tx); } };
  const wrapped = monitoredStorage(db, (error, details) => reports.push(details));
  await assert.rejects(wrapped.withExclusiveTransactionAsync(async inner => { await inner.runAsync('sensitive SQL'); }));
  assert.deepEqual(reports, [{ resource: 'database', action: 'write' }]);
});

test('handled errors retain original code locations without exposing the error message', () => {
  const monitor = mockMonitor();
  const error = new Error('private credential');
  error.stack = 'Error: private credential\n    at saveLocalFlight (app/storage/flights.js:32:5)\n    at request (app/api.js?token=private:1:2)';
  monitor.report(error, { resource: 'database', action: 'write' });
  assert.match(monitor.events[0].error.stack, /flights.js:32:5/);
  assert.equal(monitor.events[0].error.stack.includes('private'), false);
});

test('expected sync failures keep their normal queue behavior without error alerts', async () => {
  for (const status of [undefined, 400, 409, 422, 500]) {
    const monitor = mockMonitor(); let claimed = false; let persisted = false;
    const error = status ? { response: { status }, message: 'private server message' } : { code: 'ERR_NETWORK' };
    const store = { nextOperation: async () => claimed ? null : (claimed = true, { local_id: 'server:148', request: '{"action":"update","flight_id":148}' }),
      failOperation: async () => { persisted = true; }, acknowledge: async () => assert.fail('failure cannot acknowledge') };
    const worker = drainFlightQueue({ store, scope: 'account', uuid: () => 'operation', isCurrent: async () => true,
      send: async () => { throw error; }, onSyncEvent: (details, failure) => { monitor.breadcrumb(details); if (details.phase === 'failed') monitor.report(failure, details); } });
    if ([400, 409, 422].includes(status)) assert.equal(await worker, 0);
    else await assert.rejects(worker);
    assert.equal(persisted, true);
    assert.equal(monitor.events.length, status === 500 ? 1 : 0);
  }
});

test('draft read, write and removal errors are reported without changing recovery semantics', async () => {
  const { createDraftStore } = await import('../app/drafts/draftStore.mjs');
  const error = new Error('local device storage failed');
  const observed = [];
  const storage = { getItem: async () => { throw error; }, setItem: async () => { throw error; }, removeItem: async () => { throw error; } };
  const store = createDraftStore(storage, undefined, (failure, details) => observed.push(details));
  await assert.rejects(store.load('draft'), value => value === error);
  await assert.rejects(store.save('draft', {}, { date: '11/16/2026' }), value => value === error);
  await assert.rejects(store.remove('draft'), value => value === error);
  assert.deepEqual(observed.map(x => x.action), ['read', 'write', 'remove']);
});
