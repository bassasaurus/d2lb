export function nightPairWarnings(values) {
  const hasNight = Number.isFinite(Number(values.night)) && Number(values.night) > 0;
  const hasLandings = Number.isFinite(Number(values.landings_night)) && Number(values.landings_night) > 0;
  if (hasLandings && !hasNight) return { night: 'Night Time Required' };
  return {};
}
