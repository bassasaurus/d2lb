import React from "react";
import { View, StyleSheet } from "react-native";
import FlightForm from "../components/FlightForm";

function FlightUpdateScreen({ route }) {
  const dataToUpdate = route.params.item;

  Object.keys(dataToUpdate).forEach(function (key) {
    if (dataToUpdate[key] === null) {
      dataToUpdate[key] = "";
    }
    console.log(dataToUpdate);
  });

  return <FlightForm update={true} dataToUpdate={dataToUpdate}></FlightForm>;
}
const styles = StyleSheet.create({
  container: {},
});

export default FlightUpdateScreen;
