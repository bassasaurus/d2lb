import React, { useContext } from "react";
import { StyleSheet, Alert } from "react-native";
import api from "../api/axiosConfig";
import AppContext from "../components/AppContext";
import TailnumberForm from "../components/TailnumberForm";
import { useNavigation } from "@react-navigation/native";
import removeAsyncData from "../asyncStorage/removeAsyncData";
import storeAsyncObject from "../asyncStorage/storeAsyncObject";
import fetchTailnumbers from "../api/fetchTailnumbers";

function TailnumberCreateScreen({ actype }) {
  const Context = useContext(AppContext);
  const navigation = useNavigation();
  const initialValues = {
    aircraft: actype,
    registration: "",
    is_91: false,
    is_135: false,
    is_121: false,
  };

  const create = (data) => {
    api
      .post("/api/tailnumbers/", data)
      .then((response) => {
        navigation.navigate("FlightCreate");
        Context.setActivityVisible(false);
      })
      .then(() => {
        fetchTailnumbers();
      })
      .catch(function (error) {
        console.log(error);
        Context.setActivityVisible(false);
        Alert.alert("An error occurred. \n Please try again.");
      });
  };
  return (
    <TailnumberForm
      method={create}
      initialValues={initialValues}
      actype={actype}
    ></TailnumberForm>
  );
}

const styles = StyleSheet.create({
  container: {},
});

export default TailnumberCreateScreen;
