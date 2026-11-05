import React, { useContext } from "react";
import { StyleSheet, Alert } from "react-native";
import api from "../api/axiosConfig";
import AppContext from "../components/AppContext";
import TailnumberForm from "../components/TailnumberForm";
import { useNavigation } from "@react-navigation/native";
import removeAsyncData from "../asyncStorage/removeAsyncData";
import storeAsyncObject from "../asyncStorage/storeAsyncObject";
import fetchTailnumbers from "../api/fetchTailnumbers";
import syncFlightData from "../api/syncFlightData";

function TailnumberCreateScreen({ route }) {
  const Context = useContext(AppContext);
  const navigation = useNavigation();
  const initialValues = {
    aircraft: route.params.aircraft_type,
    registration: "",
    is_91: false,
    is_135: false,
    is_121: false,
  };

  const create = async data => {
    if (route.params.fromAircraft) await syncFlightData();
    const response = await api.post("/api/tailnumbers/", data);
    // A cache refresh failure does not mean the successfully saved record failed.
    await fetchTailnumbers().catch(() => {});
    return response.data;
  };

  return (
    <TailnumberForm
      method={create}
      onSaved={() => route.params.fromAircraft ? navigation.goBack() : navigation.navigate("FlightCreate")}
      initialValues={initialValues}
      aircraft_type={route.params.aircraft_type}
    ></TailnumberForm>
  );
}

const styles = StyleSheet.create({
  container: {},
});

export default TailnumberCreateScreen;
