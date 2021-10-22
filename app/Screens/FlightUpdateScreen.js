import React, { useContext } from "react";
import { StyleSheet, Alert } from "react-native";
import FlightForm from "../components/FlightForm";
import api from "../api/axiosConfig";
import AppContext from "../components/AppContext";

import { useNavigation } from "@react-navigation/native";

function FlightUpdateScreen({ route }) {
  const apiData = route.params.item;

  const Context = useContext(AppContext);

  Object.keys(apiData).forEach(function (key) {
    if (apiData[key] === null) {
      apiData[key] = "";
    }
    while (apiData.approaches.length < 4) {
      apiData.approaches.push({ approach_type: "", number: "" });
    }
  });

  const navigation = useNavigation();

  const update = (data) => {
    const primary_key = data.id;
    Context.setActivityVisible(true);
    api
      .put("/api/flights/" + primary_key + "/", data)
      .then(() => navigation.navigate("FlightList"))
      .catch((error) => {
        console.log(error.response.data);
        // setSubmitting(false);
        Alert.alert("An error occurred. \n Please try again.");
      });
  };

  return <FlightForm method={update} initialValues={apiData}></FlightForm>;
}
const styles = StyleSheet.create({
  container: {},
});

export default FlightUpdateScreen;
