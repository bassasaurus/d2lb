import { applyAircraftFlightDefaults } from '../forms/aircraftFlightDefaults.mjs';
import { listTailnumbers } from '../storage/tailnumbers';
import React, { useEffect, useState } from "react";
import { ActivityIndicator, View } from 'react-native';
import { flightScope, flightStore } from '../storage/flights';
import { aircraftScope } from '../storage/aircraft';
import { defaultAircraftType } from '../storage/flightDefaults.mjs';
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
      const [aircraft, tailnumbers] = await Promise.all([
        store.list(aircraftScope(scope)), listTailnumbers(scope),
      ]);
      const type = defaultAircraftType({ aircraft, tailnumbers });
      if (active) setDefaults(await flightScope() === scope ? { type, aircraft: aircraft.find(row => !row._default_preference && row.aircraft_type === type) } : { type: '' });
    })().catch(() => { if (active) setDefaults({ type: '' }); });
    return () => { active = false; };
  }, []);

  const initialValues = applyAircraftFlightDefaults({
    date: "",
    route: "",
    aircraft_type: defaults?.type || "",
    registration: "",
    duration: "",
    pilot_in_command: false,
    second_in_command: false,
    solo: false,
    dual: false,
    instructor: false,
    simulator: false,
    device_type: "",
    launch_method: "",
    device_id: "",
    atd_type: "",
    instrument_credit_eligible: false,
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
  }, defaults?.aircraft);

  const create = data => saveLocalFlight(data);

  if (defaults === null) return <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}><ActivityIndicator /></View>;

  return (
    <FlightForm commitDateOnSelection method={create} initialValues={initialValues} noDefaultAircraft={!defaults.type}
      onDraftSaved={() => navigation.popTo("FlightList")}
      onChooseDefault={() => navigation.navigate("Aircraft", { screen: "AircraftList", initial: false })} onSaved={() => navigation.popTo("FlightList")}></FlightForm>
  );
}

export default FlightCreateScreen;
