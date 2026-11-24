export const LAUNCH_METHODS = [['AEROTOW', 'Aerotow'], ['GROUND', 'Ground Launch'], ['SELF', 'Self-launch']];
export const isGliderFlight = (values, aircraft) => aircraft?.aircraft_category === 'GL' && !values.simulator;
export const launchChoices = aircraft => LAUNCH_METHODS.filter(([key]) => key !== 'SELF' || aircraft?.self_launch_capable === true);
export const launchLabel = method => LAUNCH_METHODS.find(([key]) => key === method)?.[1] || method;
export function launchMethodErrors(values, aircraft) {
  const method = values.launch_method || '';
  if (!isGliderFlight(values, aircraft)) {
    if (method && (aircraft || values.simulator)) return {launch_method: 'Glider flight required.'};
    return {};
  }
  if (method && !LAUNCH_METHODS.some(([key]) => key === method)) return {launch_method: 'Choose a launch method.'};
  if (method === 'SELF' && aircraft.self_launch_capable !== true) return {launch_method: 'Aircraft is not self-launch capable.'};
  return !method ? {launch_method: 'Choose a launch method.'} : {};
}
export function prepareLaunchEntry(values, aircraft) {
  if (values.simulator || aircraft && aircraft.aircraft_category !== 'GL') return {...values, launch_method: ''};
  return {...values, launch_method: values.launch_method || ''};
}
export function changeFlightAircraft(values, type, aircraft) {
  const next = prepareLaunchEntry({...values, aircraft_type: type}, aircraft);
  if (aircraft && next.launch_method === 'SELF' && !aircraft.self_launch_capable) next.launch_method = '';
  return next;
}
