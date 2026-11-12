export function focusedFieldOffset({ field, viewport, keyboardTop, offset, gap = 12 }) {
  const top = viewport.y + gap;
  const bottom = Math.min(viewport.y + viewport.height, keyboardTop ?? Infinity) - gap;
  if (bottom <= top) return offset;
  const fieldBottom = field.y + Math.min(field.height, bottom - top);
  const adjustment = field.y < top ? field.y - top : Math.max(0, fieldBottom - bottom);
  return Math.max(0, offset + adjustment);
}
