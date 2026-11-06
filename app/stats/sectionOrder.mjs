export const RECENCY_SECTIONS = ['vfr', 'ifr', 'type'];
export function normalizeSectionOrder(value) {
  const stored = Array.isArray(value) ? value : [];
  return [...new Set([...stored.filter(key => RECENCY_SECTIONS.includes(key)), ...RECENCY_SECTIONS])];
}
export function moveSection(order, key, destination) {
  const result = normalizeSectionOrder(order).filter(item => item !== key);
  if (!RECENCY_SECTIONS.includes(key)) return normalizeSectionOrder(order);
  result.splice(Math.max(0, Math.min(result.length, destination)), 0, key);
  return result;
}
export function dropSection(order, key, headerCenter, layouts) {
  const visible = order.filter(item => layouts[item]);
  const target = visible.filter(item => item !== key && layouts[item].y + 24 < headerCenter).length;
  const remaining = order.filter(item => item !== key);
  const visibleRemaining = remaining.filter(item => layouts[item]);
  const anchor = visibleRemaining[target];
  return moveSection(order, key, anchor ? remaining.indexOf(anchor) : remaining.length);
}
