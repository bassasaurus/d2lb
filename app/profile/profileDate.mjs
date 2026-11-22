export function profileDate(value) {
  if (!value) return 'Not recorded';
  const [year, month, day] = value.slice(0, 10).split('-');
  return `${month}/${day}/${year}`;
}
