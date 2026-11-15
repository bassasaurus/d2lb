import { validationFields } from '../forms/errorFeedback.mjs';
export function isValidationIssue(response) {
  if (!response) return false;
  if (response._http_status === 409) return false;
  if ([400, 422].includes(response._http_status)) return true;
  if (/changed|no longer available|already used/i.test(response.detail || '')) return false;
  return !/conflict|missing/i.test(response.code || '') && !response.server_flight && !response.server_record;
}
const labels = { aircraft_type: 'Aircraft', aircraft: 'Aircraft', registration: 'Tailnumber', target_hours: 'Target hours', company_end_date: 'End date' };
export function validationMessages(response) {
  if (!response || !isValidationIssue(response)) return [];
  const messages = Object.entries(validationFields(response)).map(([key, value]) =>
    ['detail', 'non_field_errors'].includes(key) ? value : `${labels[key] || key.replace(/_/g, ' ')}: ${value}`);
  return messages.length ? [...new Set(messages)].slice(0, 6) : ['Couldn’t sync this record. Please check its details.'];
}
