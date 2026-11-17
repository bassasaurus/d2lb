const resources = new Set(['flight', 'aircraft', 'tailnumber', 'default aircraft', 'draft', 'database', 'session', 'support']);
const phases = new Set(['started', 'saved', 'synced', 'failed', 'offline', 'validation', 'conflict', 'auth_required', 'opened', 'screen', 'connected']);
const actions = new Set(['create', 'update', 'delete', 'sync', 'read', 'write', 'remove', 'open', 'support']);
const codes = new Set(['Error', 'TypeError', 'RangeError', 'ReferenceError', 'SyntaxError']);
const messages = new Set(['Local storage operation failed', 'Mobile sync failed', 'Local draft operation failed', 'Support requested', 'Sentry verification exception']);
const expected = /^(?:Network Error|Network request failed|Failed to fetch|Offline|Account changed during sync\.|Sign in before accessing local flights\.|Aircraft changes must sync before this flight\.|Tailnumber must upload before this flight\.|Aircraft must upload before this tailnumber\.|Server sync upgrade is required\.|Airport validation requires the server update\.|Default aircraft sync requires the server update\.)/i;
export function expectedFailure(error) {
  const status = error?.response?.status;
  return [400, 401, 403, 404, 408, 409, 422, 429].includes(status)
    || ['ERR_NETWORK', 'ECONNABORTED', 'ETIMEDOUT', 'ERR_CANCELED'].includes(error?.code)
    || error?.name === 'AbortError' || error?.name === 'CanceledError'
    || expected.test(error?.message || '');
}
export function safeDetails(input = {}) {
  const result = {};
  if (resources.has(input.resource)) result.resource = input.resource;
  if (phases.has(input.phase)) result.phase = input.phase;
  if (actions.has(input.action)) result.action = input.action;
  for (const field of ['record_id', 'account_id', 'attempt', 'http_status']) {
    if (Number.isSafeInteger(input[field]) && input[field] >= 0) result[field] = input[field];
  }
  if (typeof input.local_id === 'string' && /^(?:server:\d+|[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})$/i.test(input.local_id)) result.local_id = input.local_id;
  if (typeof input.screen === 'string' && /^[A-Za-z][A-Za-z &]{0,60}$/.test(input.screen)) result.screen = input.screen;
  return result;
}
export function safeBreadcrumb(crumb) {
  if (crumb.category !== 'app.diagnostic') return null;
  return { category: 'app.diagnostic', level: 'info', timestamp: crumb.timestamp, data: safeDetails(crumb.data) };
}
const pick = (value, keys) => Object.fromEntries(keys.filter(key => ['string', 'number', 'boolean'].includes(typeof value?.[key])).map(key => [key, value[key]]));
export function safeEvent(event, hint = {}) {
  if (expectedFailure(hint.originalException) || event.exception?.values?.some(value => expectedFailure({ message: value.value }))) return null;
  const clean = pick(event, ['event_id', 'timestamp', 'platform', 'level', 'release', 'dist', 'environment', 'logger']);
  clean.tags = pick(event.tags, ['app_version', 'app_build', 'app_platform', 'build_channel', 'api_environment', 'feature']);
  clean.contexts = {};
  for (const [key, fields] of Object.entries({
    app: ['app_identifier', 'app_version', 'app_build'], device: ['family', 'model', 'brand', 'manufacturer', 'arch', 'simulator'],
    os: ['name', 'version', 'build'], runtime: ['name', 'version'],
  })) if (event.contexts?.[key]) clean.contexts[key] = pick(event.contexts[key], fields);
  if (event.contexts?.diagnostic) clean.contexts.diagnostic = safeDetails(event.contexts.diagnostic);
  const replayId = event.contexts?.replay?.replay_id;
  if (typeof replayId === 'string' && /^[0-9a-f]{32}$|^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(replayId)) {
    clean.contexts.replay = { replay_id: replayId };
  }
  if (/^\d+$/.test(event.user?.id || '')) clean.user = { id: String(event.user.id) };
  if (event.message) clean.message = messages.has(event.message) ? event.message : 'Unexpected app error';
  if (event.exception?.values) clean.exception = { values: event.exception.values.map(value => ({
    type: codes.has(value.type) ? value.type : 'Error',
    value: messages.has(value.value) ? value.value : 'Unexpected app error',
    ...(value.mechanism ? { mechanism: pick(value.mechanism, ['type', 'handled', 'synthetic']) } : {}),
    ...(value.stacktrace ? { stacktrace: { frames: (value.stacktrace.frames || []).map(frame => pick(frame,
      ['filename', 'abs_path', 'function', 'module', 'lineno', 'colno', 'in_app', 'instruction_addr', 'package', 'platform'])) } } : {}),
  })) };
  // Debug IDs and native image addresses are needed for source-map/symbol lookup.
  if (event.debug_meta) clean.debug_meta = event.debug_meta;
  clean.breadcrumbs = (event.breadcrumbs || []).map(safeBreadcrumb).filter(Boolean);
  return clean;
}
