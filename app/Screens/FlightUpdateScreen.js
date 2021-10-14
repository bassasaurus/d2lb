import React from "react";
import { View, StyleSheet } from "react-native";
import FlightForm from "../components/FlightForm";

function FlightUpdateScreen({ route }) {
  const apiData = route.params.item;

  Object.keys(apiData).forEach(function (key) {
    if (apiData[key] === null) {
      apiData[key] = "";
    }
    console.log(apiData);
  });

  return <FlightForm></FlightForm>;
}
const styles = StyleSheet.create({
  container: {},
});

export default FlightUpdateScreen;
