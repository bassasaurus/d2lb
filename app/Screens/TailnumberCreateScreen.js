import React from 'react';
import { useNavigation } from '@react-navigation/native';
import TailnumberForm from '../components/TailnumberForm';
import { saveLocalTailnumber } from '../storage/tailnumbers';

function TailnumberCreateScreen({ route }) {
  const navigation = useNavigation();
  const aircraftType = route.params?.aircraft_type || '';
  const initialValues = {
    aircraft: aircraftType,
    registration: "",
    is_91: false,
    is_135: false,
    is_121: false,
  };

  const create = data => saveLocalTailnumber(aircraftType ? { ...data, aircraft: aircraftType } : data);

  return (
    <TailnumberForm
      key={`new:${aircraftType}`}
      method={create}
      onSaved={item => navigation.replace('TailnumberDetail', { item })}
      initialValues={initialValues}
      aircraft_type={aircraftType}
      allowAircraftChange={!aircraftType}
    ></TailnumberForm>
  );
}

export default TailnumberCreateScreen;
