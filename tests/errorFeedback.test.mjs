import test from 'node:test';
import assert from 'node:assert/strict';
import { formFeedback, syncErrorResponse } from '../app/forms/errorFeedback.mjs';
import { validationMessages } from '../app/sync/issuePresentation.mjs';

test('field validation stays inline while server diagnostics stay hidden', () => {
  assert.deepEqual(formFeedback({ response: { status: 400, data: { registration: ['This tailnumber already exists in your logbook.'] } } }, 'tailnumber'),
    { fields: { registration: 'This tailnumber already exists in your logbook.' }, status: undefined });
  for (const status of [400, 500, 503]) {
    const feedback = formFeedback({ response: { status, data: { detail: 'IntegrityError: duplicate key violates constraint private_name' } } }, 'flight');
    assert.deepEqual(feedback.fields, {});
    assert.equal(feedback.status, 'Couldn’t save this flight. Please try again.');
  }
});
test('internal sync failures retain retry status without storing database diagnostics', () => {
  assert.deepEqual(syncErrorResponse({ status: 503, data: '<html>SQL traceback</html>' }), { _http_status: 503 });
  assert.deepEqual(syncErrorResponse({ status: 400, data: { route: ['Required'], detail: 'violates constraint private' } }), { route: 'Required', _http_status: 400 });
});
test('conflict comparisons retain the server record and review uses readable field names', () => {
  const data = { server_flight: { id: 7, duration: '1.5' }, code: 'conflict' };
  assert.deepEqual(syncErrorResponse({ status: 409, data }), { ...data, _http_status: 409 });
  assert.deepEqual(validationMessages({ registration: ['Choose a tailnumber for A320.'], _http_status: 400 }), ['Tailnumber: Choose a tailnumber for A320.']);
  assert.deepEqual(validationMessages({ detail: 'SQLSTATE violates constraint', _http_status: 400 }), ['Couldn’t sync this record. Please check its details.']);
});
