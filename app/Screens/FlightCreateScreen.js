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

  const create = (data) => {
    api
      .post("/api/flights/", data)
      .then(() => navigation.navigate("FlightList"))
      .catch(function (error) {
        setSubmitting(false);
        Alert.alert("An error occurred. \n Please try again.");
      });
  };

  return (
    <FlightForm method={create} initialValues={initialValues}></FlightForm>
  );
}

const styles = StyleSheet.create({
  container: {},
});

export default FlightCreateScreen;
