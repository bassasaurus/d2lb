export function scrollOverflow({ content = 0, viewport = 0, offset = 0, insetEnd = 0 }) {
  const overflow = viewport > 0 && content + insetEnd > viewport + 2;
  return { before: overflow && offset > 2, after: overflow && offset + viewport < content + insetEnd - 2 };
}
