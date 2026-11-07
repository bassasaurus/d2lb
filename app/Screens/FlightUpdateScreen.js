import React, { useContext } from "react";
import { Alert } from "react-native";
import FlightForm from "../components/FlightForm";
import { saveLocalFlight } from "../storage/flights";
import AppContext from "../components/AppContext";

import { useNavigation } from "@react-navigation/native";

function FlightUpdateScreen({ route }) {
  const apiData = JSON.parse(JSON.stringify(route.params.item));

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

  const update = data => saveLocalFlight(data);

  return <FlightForm method={update} initialValues={apiData} onSaved={item => navigation.popTo("FlightDetail", { item })}></FlightForm>;
}

export default FlightUpdateScreen;
