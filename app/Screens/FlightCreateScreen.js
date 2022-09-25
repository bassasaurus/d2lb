import React, { useContext } from "react";
import { Alert } from "react-native";
import FlightForm from "../components/FlightForm";
import api from "../api/axiosConfig";
import AppContext from "../components/AppContext";

import { useNavigation } from "@react-navigation/native";
import createFlight from "../api/createFlight";

function FlightCreateScreen() {
  const Context = useContext(AppContext);
  const navigation = useNavigation();

  const initialValues = {
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

  const create = createFlight();

  return (
    <FlightForm method={create} initialValues={initialValues}></FlightForm>
  );
}

export default FlightCreateScreen;
