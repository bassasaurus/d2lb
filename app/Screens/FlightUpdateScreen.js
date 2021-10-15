import React from "react";
import { View, StyleSheet } from "react-native";
import FlightForm from "../components/FlightForm";
import api from "../api/axiosConfig";

function FlightUpdateScreen({ route }) {
  const apiData = route.params.item;

  Object.keys(apiData).forEach(function (key) {
    if (apiData[key] === null) {
      apiData[key] = "";
    }
    while (apiData.approaches.length < 4) {
      apiData.approaches.push({ approach_type: "", number: "" });
    }
  });

  const update = (data) => {
    const primary_key = data.id;
    api
      .put("/api/flights/" + primary_key + "/", data)
      .then(() => navigation.navigate("FlightList"))
      .catch(() => {
        setSubmitting(false);
        Alert.alert("An error occurred. \n Please try again.");
      });
  };

  return <FlightForm method={update} initialValues={apiData}></FlightForm>;
}
const styles = StyleSheet.create({
  container: {},
});

export default FlightUpdateScreen;
