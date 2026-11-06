export function validCoordinate(point) {
  return point && Number.isFinite(point.latitude) && Number.isFinite(point.longitude)
    && Math.abs(point.latitude) <= 90 && Math.abs(point.longitude) <= 180;
}
const radians = value => value * Math.PI / 180;
const degrees = value => value * 180 / Math.PI;

// Include the great-circle arc's interior, not only airport endpoints, so a
// long geodesic does not bow outside the viewport after fitting its markers.
export function routeFitCoordinates(route, markers = []) {
  const points = (Array.isArray(route) ? route : []).filter(validCoordinate);
  if (!points.length) return markers.map(marker => marker.coordinates).filter(validCoordinate);
  const result = [points[0]];
  for (let index = 1; index < points.length; index++) {
    const start = points[index - 1], end = points[index];
    const vector = point => {
      const lat = radians(point.latitude), lon = radians(point.longitude);
      return [Math.cos(lat) * Math.cos(lon), Math.cos(lat) * Math.sin(lon), Math.sin(lat)];
    };
    const a = vector(start), b = vector(end);
    const angle = Math.acos(Math.max(-1, Math.min(1, a.reduce((sum, value, i) => sum + value * b[i], 0))));
    const steps = Math.max(1, Math.ceil(degrees(angle) / 2));
    if (Math.abs(Math.sin(angle)) > 0.00001) {
      for (let step = 1; step < steps; step++) {
        const fraction = step / steps;
        const left = Math.sin((1 - fraction) * angle) / Math.sin(angle);
        const right = Math.sin(fraction * angle) / Math.sin(angle);
        const [x, y, z] = a.map((value, i) => left * value + right * b[i]);
        result.push({ latitude: degrees(Math.atan2(z, Math.hypot(x, y))), longitude: degrees(Math.atan2(y, x)) });
      }
    }
    result.push(end);
  }
  const unique = new Map(result.map(point => [`${point.latitude},${point.longitude}`, point]));
  for (const marker of markers) if (validCoordinate(marker.coordinates)) unique.set(`${marker.coordinates.latitude},${marker.coordinates.longitude}`, marker.coordinates);
  return [...unique.values()];
}
export function routeMapPadding(width, height) {
  const padding = Math.round(Math.max(12, Math.min(40, width * 0.12, height * 0.12)));
  return { top: padding + Math.min(12, Math.round(height * 0.04)), right: padding, bottom: padding, left: padding };
}
