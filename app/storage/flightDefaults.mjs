export function selectedDefaultType(aircraft) {
  const preference = aircraft.find(row => row._default_preference);
  return preference ? preference.aircraft_type : aircraft.find(row => row.is_default)?.aircraft_type || '';
}
export function defaultAircraftType({ aircraft, tailnumbers }) {
  const defaultType = selectedDefaultType(aircraft);
  const available = new Set([...aircraft.filter(row => !row._default_preference).map(row => row.aircraft_type), ...tailnumbers.map(row => row.aircraft)]);
  return available.has(defaultType) ? defaultType : '';
}
