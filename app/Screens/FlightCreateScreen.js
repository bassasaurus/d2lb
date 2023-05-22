import React, { useContext } from "react";

import FlightForm from "../components/FlightForm";

import AppContext from "../components/AppContext";

import { useNavigation } from "@react-navigation/native";

function FlightCreateScreen() {
  const Context = useContext(AppContext);
  const navigation = useNavigation();

  const initialValues = {
    id: "5000",
    date: "",
    route: "",
    aircraft_type: "",
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

  const create = (data) => {
    console.log(Context.flightDataValue.length)
    Context.setFlightData(Context.flightDataValue.unshift(data))
    console.log(Context.flightDataValue.length)
    navigation.navigate("FlightList");
    Context.setActivityVisible(false);
     
  };

  return (
    <FlightForm method={create} initialValues={initialValues}></FlightForm>
  );
}

export default FlightCreateScreen;
