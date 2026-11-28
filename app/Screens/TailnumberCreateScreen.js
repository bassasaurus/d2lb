import { flightReturnTarget } from '../ocr/registrationCandidates.mjs';
import React from 'react';
import { CommonActions, useNavigation } from '@react-navigation/native';
import TailnumberForm from '../components/TailnumberForm';
import { saveLocalTailnumber } from '../storage/tailnumbers';

function TailnumberCreateScreen({ route }) {
  const navigation = useNavigation();
  const aircraftType = route.params?.aircraft_type || '';
  const initialValues = {
    aircraft: aircraftType,
    registration: route.params?.registration || '',
    is_91: false,
    is_135: false,
    is_121: false,
    is_125: false,
    is_137: false,
  };

  const create = data => saveLocalTailnumber(aircraftType ? { ...data, aircraft: aircraftType } : data);

  return (
    <TailnumberForm
      key={`new:${aircraftType}`}
      method={create}
      onSaved={item => {
        const destination = flightReturnTarget(route.params?.returnToFlight, navigation.getState());
        if (destination) {
          navigation.dispatch({ ...CommonActions.setParams({ createdTailnumber: {
            registration: item.registration, aircraft: item.aircraft,
          } }), source: destination.key, target: destination.stackKey });
          navigation.goBack();
        } else navigation.replace('TailnumberDetail', { item });
      }}
      initialValues={initialValues}
      aircraft_type={aircraftType}
      allowAircraftChange={!aircraftType}
    ></TailnumberForm>
  );
}

export default TailnumberCreateScreen;
