import React from "react";
import FlightForm from "../components/FlightForm";
import { useNavigation } from "@react-navigation/native";
import addItemToArray from "../asyncStorage/addItemToArray";


function FlightCreateScreen() {
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

  const create = async (data) => {
    
    addItemToArray('offlineFlights', data)
    
    navigation.navigate("FlightList");
    
  };

  return (
    <FlightForm method={create} initialValues={initialValues}></FlightForm>
  );
}

export default FlightCreateScreen;
