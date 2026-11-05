import { listTailnumbers } from '../storage/tailnumbers';
import React, { useEffect, useState } from "react";
import { ActivityIndicator, View } from 'react-native';
import { flightScope, flightStore } from '../storage/flights';
import { aircraftScope } from '../storage/aircraft';
import { lastAircraftType } from '../storage/flightDefaults.mjs';
import FlightForm from "../components/FlightForm";
import { useNavigation } from "@react-navigation/native";
import { saveLocalFlight } from "../storage/flights";


function FlightCreateScreen() {
  const navigation = useNavigation();
  const [defaults, setDefaults] = useState(null);
  useEffect(() => {
    let active = true;
    (async () => {
      const scope = await flightScope();
      const store = await flightStore();
      const [preferred, flights, aircraft, tailnumbers] = await Promise.all([
        store.reference(scope, 'last-aircraft'), store.list(scope), store.list(aircraftScope(scope)), listTailnumbers(scope),
      ]);
      const type = lastAircraftType({ preferred: preferred[0]?.aircraft_type, flights, aircraft, tailnumbers });
      if (active) setDefaults(await flightScope() === scope ? type : '');
    })().catch(() => { if (active) setDefaults(''); });
    if (defaults === null) return <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}><ActivityIndicator /></View>;

  return () => { active = false; };
  }, []);

  const initialValues = {
    date: "",
    route: "",
    aircraft_type: defaults || "",
    registration: "",
    duration: "",
    pilot_in_command: false,
    second_in_command: false,
    solo: false,
    dual: false,
    instructor: false,
    simulator: false,
    cross_country: false,
    landings_day: "",
    landings_night: "",
    instrument: "",
    simulated_instrument: "",
    night: "",
    approaches: [
      { approach_type: "", number: "" },
      { approach_type: "", number: "" },
      { approach_type: "", number: "" },
      { approach_type: "", number: "" },
    ],
    hold: false,
    remarks: "",
  };

  const create = data => saveLocalFlight(data);

  if (defaults === null) return <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}><ActivityIndicator /></View>;

  return (
    <FlightForm method={create} initialValues={initialValues} onSaved={() => navigation.navigate("FlightList")}></FlightForm>
  );
}

export default FlightCreateScreen;
