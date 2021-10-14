import React from "react";
import { View, StyleSheet } from "react-native";
import FlightForm from "../components/FlightForm";

function FlightCreateScreen() {
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
    approaches: [
      { approach_type: "", number: "" },
      { approach_type: "", number: "" },
      { approach_type: "", number: "" },
      { approach_type: "", number: "" },
    ],
    holding: false,
    remarks: "",
  };

  return <FlightForm initialValues={initialValues}></FlightForm>;
}

const styles = StyleSheet.create({
  container: {},
});

export default FlightCreateScreen;
