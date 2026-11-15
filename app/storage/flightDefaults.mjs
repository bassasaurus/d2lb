export function selectedDefaultType(aircraft) {
  const preference = aircraft.find(row => row._default_preference);
  return preference ? preference.aircraft_type : aircraft.find(row => row.is_default)?.aircraft_type || '';
}
export function defaultAircraftType({ aircraft, tailnumbers }) {
  const defaultType = selectedDefaultType(aircraft);
  const available = new Set([...aircraft.filter(row => !row._default_preference).map(row => row.aircraft_type), ...tailnumbers.map(row => row.aircraft)]);
  return available.has(defaultType) ? defaultType : '';
}

export function aircraftWithDefault(aircraft, defaultType = selectedDefaultType(aircraft)) {
  let selected = false;
  return aircraft.filter(row => !row._default_preference).map(row => {
    const is_default = !selected && Boolean(defaultType) && row.aircraft_type === defaultType;
    selected ||= is_default;
    return { ...row, is_default };
  });
}
