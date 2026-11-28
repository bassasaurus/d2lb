export function nightLandingErrors(values) {
  const errors = {};
  if (values.night_landings_full_stop) {
    if (!(Number(values.landings_night) > 0)) errors.night_landings_full_stop = 'Enter Night landings.';
    if (!(Number(values.night) > 0)) errors.night = 'Night time required for Full Stop.';
  }
  return errors;
}
