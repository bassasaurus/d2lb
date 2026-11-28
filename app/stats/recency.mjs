const isoDate = value => typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value) && Number.isFinite(Date.parse(value));
function validStatus(status) {
  return status && Number.isInteger(status.count) && status.count >= 0
    && Number.isInteger(status.required) && status.required > 0 && typeof status.current === 'boolean';
}
export function validateRecency(data) {
  if (data?.schema_version !== 1 || !Number.isFinite(Date.parse(data.downloaded_at))
    || typeof data.as_of !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(data.as_of)
    || !Array.isArray(data.categories) || !Array.isArray(data.types)
    || !validStatus(data.instrument?.approaches) || !validStatus(data.instrument?.holding)) {
    throw new Error('Invalid recency response');
  }
  for (const row of [...data.categories, ...data.types]) {
    if (typeof row?.label !== 'string' || !row.label || !validStatus(row.day) || !validStatus(row.night)
      || [row.day, row.night].some(value => value.last_dates !== undefined && (!Array.isArray(value.last_dates) || value.last_dates.length > 3 || value.last_dates.some(day => !isoDate(day)))
        || value.valid_through != null && !isoDate(value.valid_through))) {
      throw new Error('Invalid landing recency');
    }
  }
  if (data.instrument_categories !== undefined) {
    if (!Array.isArray(data.instrument_categories) || data.instrument_categories.some(row =>
      !['A', 'R', ''].includes(row?.category) || typeof row.category_label !== 'string'
      || !validStatus(row.approaches) || !validStatus(row.holding))) throw new Error('Invalid instrument categories');
  }
  return data;
}
