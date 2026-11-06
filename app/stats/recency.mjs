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
    if (typeof row?.label !== 'string' || !row.label || !validStatus(row.day) || !validStatus(row.night)) {
      throw new Error('Invalid landing recency');
    }
  }
  return data;
}
