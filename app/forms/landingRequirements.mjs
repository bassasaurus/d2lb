export function hasRequiredSoloLandings(values) {
  if (!values.solo) return true;
  return [values.landings_day, values.landings_night].some(value => {
    const count = Number(value);
    return Number.isInteger(count) && count > 0;
  });
}
