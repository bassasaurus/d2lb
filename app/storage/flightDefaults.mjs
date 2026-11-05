export function lastAircraftType({ preferred, flights, aircraft, tailnumbers }) {
  const available = new Set([...aircraft.map(row => row.aircraft_type), ...tailnumbers.map(row => row.aircraft)]);
  if (available.has(preferred)) return preferred;
  return flights.find(row => available.has(row.aircraft_type))?.aircraft_type || '';
}
