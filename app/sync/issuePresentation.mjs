export function isValidationIssue(response) {
  if (!response) return false;
  if (response._http_status === 409) return false;
  if ([400, 422].includes(response._http_status)) return true;
  if (/changed|no longer available|already used/i.test(response.detail || '')) return false;
  return !/conflict|missing/i.test(response.code || '') && !response.server_flight && !response.server_record;
}
export function validationMessages(response) {
  if (!response || !isValidationIssue(response)) return [];
  const messages = [];
  function visit(value, label) {
    if (Array.isArray(value)) value.forEach(item => visit(item, label));
    else if (value && typeof value === 'object') Object.entries(value)
      .filter(([key]) => !['code', 'server_flight', 'server_record', '_http_status'].includes(key))
      .forEach(([key, child]) => visit(child, ['detail', 'non_field_errors'].includes(key) ? label : key.replace(/_/g, ' ')));
    else if (typeof value === 'string') messages.push(`${label ? `${label}: ` : ''}${value}`);
  }
  visit(response, '');
  return [...new Set(messages)].slice(0, 6);
}
