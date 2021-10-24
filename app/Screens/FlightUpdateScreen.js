import React, { useContext } from "react";
import { Alert } from "react-native";
import FlightForm from "../components/FlightForm";
import api from "../api/axiosConfig";
import AppContext from "../components/AppContext";

import { useNavigation } from "@react-navigation/native";

function FlightUpdateScreen({ route }) {
  const apiData = route.params.item;

  const Context = useContext(AppContext);
  const navigation = useNavigation();

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
      .then(() => {
        navigation.navigate("FlightList");
        Context.setActivityVisible(false);
      })
      .catch((error) => {
        Context.setActivityVisible(false);
        Alert.alert("An error occurred. \n Please try again.");
      });
  };

  return <FlightForm method={update} initialValues={apiData}></FlightForm>;
}

export default FlightUpdateScreen;
