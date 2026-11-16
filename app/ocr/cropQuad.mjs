export const DEFAULT_CROP_CORNERS = [[0.04, 0.08], [0.96, 0.08], [0.96, 0.92], [0.04, 0.92]];
export function validCropCorners(points) {
  if (!Array.isArray(points) || points.length !== 4 || !points.every(p => Array.isArray(p) && p.length === 2 && p.every(n => Number.isFinite(n) && n >= 0 && n <= 1))) return false;
  let area = 0;
  for (let i = 0; i < 4; i++) {
    const [a, b, c] = [points[i], points[(i + 1) % 4], points[(i + 2) % 4]];
    if ((b[0] - a[0]) * (c[1] - b[1]) - (b[1] - a[1]) * (c[0] - b[0]) <= 0) return false;
    area += a[0] * b[1] - b[0] * a[1];
  }
  return area > 0.01;
}
