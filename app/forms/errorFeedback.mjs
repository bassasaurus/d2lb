// Only validation responses are suitable for field feedback. Never display server diagnostics.
const technical = /constraint|null value in column|psycopg|sqlstate|syntax error|connection refused|password authentication|traceback|integrityerror|databaseerror|programmingerror|operationalerror|sqlstate|duplicate key|violates|relation .*does not exist|select .*from|insert into|update .* set|<[^>]+>/i;
export function safeMessage(value) {
  return typeof value === 'string' && value.length <= 500 && !technical.test(value) ? value : null;
}
export function validationFields(data) {
  if (!data || typeof data !== 'object' || Array.isArray(data)) return {};
  const fields = {};
  for (const [key, value] of Object.entries(data)) {
    if (technical.test(key) || ['code', 'server_flight', 'server_record', '_http_status'].includes(key)) continue;
    const messages = (Array.isArray(value) ? value : [value]).map(safeMessage).filter(Boolean);
    if (messages.length) fields[key] = messages.join(' ');
  }
  return fields;
}
export function formFeedback(error, resource) {
  const fields = [400, 422].includes(error.response?.status) ? validationFields(error.response.data) : {};
  const status = fields.non_field_errors || fields.detail;
  delete fields.non_field_errors;
  delete fields.detail;
  // These are explicit local validation failures, not arbitrary exception messages.
  if (!error.response && /This aircraft type already exists in your (account|logbook)\./.test(error.message || ''))
    fields.aircraft_type = 'This aircraft type already exists in your logbook.';
  if (!error.response && /^Sync the pending flights using this tailnumber before/.test(error.message || ''))
    fields.aircraft = 'Sync the pending flights using this tailnumber before changing its registration or aircraft.';
  return { fields, status: status || (Object.keys(fields).length ? undefined : `Couldn’t save this ${resource}. Please try again.`) };
}
export function syncErrorResponse(response) {
  if (!response) return null;
  if (response.status === 409) return { ...response.data, _http_status: 409 };
  return { ...([400, 422].includes(response.status) ? validationFields(response.data) : {}), _http_status: response.status };
}
