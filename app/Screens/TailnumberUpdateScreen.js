import { saveLocalTailnumber } from '../storage/tailnumbers';
import React from 'react';
import api from '../api/axiosConfig';
import TailnumberForm from '../components/TailnumberForm';
import { flightScope, flightStore } from '../storage/flights';
import fetchTailnumbers from '../api/fetchTailnumbers';

export default function TailnumberUpdateScreen({ route, navigation }) {
  const item = route.params.item;
  const update = async values => {
    if (!item.id) return saveLocalTailnumber(values);
    const scope = await flightScope();
    const store = await flightStore();
    if (values.registration !== item.registration || values.aircraft !== item.aircraft) {
      const flights = await store.list(scope);
      if (flights.some(flight => flight.sync_state !== 'synced' && flight.registration === item.registration)) {
        throw new Error('Sync the pending flights using this tailnumber before changing its registration or aircraft.');
      }
    }
    const response = await api.put(`/api/tailnumbers/${item.id}/`, {
      registration: values.registration, aircraft: values.aircraft,
      is_91: values.is_91, is_135: values.is_135, is_121: values.is_121,
    });
    if (await flightScope() !== scope) throw new Error('Account changed while saving.');
    // A successful server save must not be reported as failed just because a
    // later cache refresh is unavailable. The next refresh will repair it.
    try {
      const rows = await store.reference(scope, 'tailnumbers');
      await store.cacheReference(scope, 'tailnumbers', rows.map(row => row.id === item.id ? response.data : row));
      await fetchTailnumbers();
    } catch (error) { /* Keep the successful save and refresh next time. */ }
    return response.data;
  };
  return <TailnumberForm initialValues={{ ...item, is_91: Boolean(item.is_91), is_135: Boolean(item.is_135), is_121: Boolean(item.is_121) }}
    method={update} onSaved={item => navigation.popTo('TailnumberDetail', { item })} aircraft_type={item.aircraft} allowAircraftChange={true} />;
}
