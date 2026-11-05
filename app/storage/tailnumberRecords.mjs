export const tailnumberScope = scope => `${scope}:tailnumbers`;
export function mergeTailnumbers(cached, queued) {
  const local = new Map(cached.map(row => [`id:${row.id}`, row]));
  for (const row of queued) {
    const key = row.id ? `id:${row.id}` : `local:${row.local_id}`;
    if (row.sync_state !== 'synced' || !local.has(key)) local.set(key, row);
  }
  return [...local.values()].sort((a, b) => a.registration.localeCompare(b.registration, 'en', { numeric: true, sensitivity: 'base' }));
}

export function prepareLocalTailnumber(values, records, flights, aircraft, references) {
  const registration = String(values.registration || '').trim().toUpperCase().replace(/\s/g, '');
  if (registration.length < 3 || registration.length > 8) throw new Error('Use 3–8 characters for registration.');
  if (['is_91', 'is_135', 'is_121'].filter(key => values[key] === true).length !== 1) throw new Error('Choose one operating rule.');
  if (records.some(row => row.registration.toUpperCase() === registration && !(values.local_id && row.local_id === values.local_id))) {
    throw new Error('This registration already exists in your account.');
  }
  const existing = values.local_id ? records.find(row => row.local_id === values.local_id) : null;
  if (existing && (existing.registration !== registration || existing.aircraft !== values.aircraft)
      && flights.some(row => row.registration === existing.registration && row.sync_state !== 'synced')) {
    throw new Error('Update the unsynced flights using this tailnumber before changing its registration or aircraft.');
  }
  if (!aircraft.some(row => row.aircraft_type === values.aircraft) && !references.some(row => row.aircraft === values.aircraft)) {
    throw new Error('Choose a saved aircraft before adding a tailnumber.');
  }
  return { ...values, registration };
}
