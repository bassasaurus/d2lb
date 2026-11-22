const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

// Date-only API values are calendar dates, not UTC instants.
export function formatDate(value, missing = 'Not recorded') {
  if (value === null || value === undefined || value === '') return missing;
  let year, month, day;
  if (value instanceof Date) {
    if (!Number.isFinite(value.getTime())) return missing;
    [year, month, day] = [value.getFullYear(), value.getMonth() + 1, value.getDate()];
  } else {
    const text = String(value);
    let parts = /^(\d{4})-(\d{2})-(\d{2})(?:T.*)?$/.exec(text);
    if (parts) [, year, month, day] = parts.map(Number);
    else {
      parts = /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/.exec(text);
      if (parts) [, month, day, year] = parts.map(Number);
      else return text;
    }
  }
  const date = new Date(0);
  date.setFullYear(Number(year), Number(month) - 1, Number(day));
  date.setHours(12, 0, 0, 0);
  if (date.getFullYear() !== Number(year) || date.getMonth() + 1 !== Number(month) || date.getDate() !== Number(day)) return String(value);
  return `${months[Number(month) - 1]} ${Number(day)}, ${Number(year)}`;
}

export function formatDateTime(value, missing = 'Not recorded') {
  if (value === null || value === undefined || value === '') return missing;
  const date = new Date(value);
  if (!Number.isFinite(date.getTime())) return missing;
  return `${formatDate(date)}, ${date.toLocaleTimeString()}`;
}
