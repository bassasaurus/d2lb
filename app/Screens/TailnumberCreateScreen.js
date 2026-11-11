import React from 'react';
import { useNavigation } from '@react-navigation/native';
import TailnumberForm from '../components/TailnumberForm';
import { saveLocalTailnumber } from '../storage/tailnumbers';
import syncFlightData from '../api/syncFlightData';

function TailnumberCreateScreen({ route }) {
  const navigation = useNavigation();
  const initialValues = {
    aircraft: route.params.aircraft_type,
    registration: "",
    is_91: false,
    is_135: false,
    is_121: false,
  };

  const create = data => saveLocalTailnumber(data);

  return (
    <TailnumberForm
      method={create}
      onSaved={item => { navigation.replace('TailnumberDetail', { item }); syncFlightData().catch(() => {}); }}
      initialValues={initialValues}
      aircraft_type={route.params.aircraft_type}
    ></TailnumberForm>
  );
}

export default TailnumberCreateScreen;
