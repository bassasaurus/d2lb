import React from "react";
import { View, StyleSheet } from "react-native";
import FlightForm from "../components/FlightForm";

function FlightUpdateScreen({ route }) {
  const dataToUpdate = route.params.item;

  return <FlightForm update={true} dataToUpdate={dataToUpdate}></FlightForm>;
}
const styles = StyleSheet.create({
  container: {},
});

export default FlightUpdateScreen;
