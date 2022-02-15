import React, { useContext } from "react";
import { StyleSheet, Alert } from "react-native";
import api from "../api/axiosConfig";
import AppContext from "../components/AppContext";
import TailnumberForm from "../components/TailnumberForm";
import { useNavigation } from "@react-navigation/native";

function TailnumberCreateScreen(props) {
  const Context = useContext(AppContext);
  const navigation = useNavigation();
  const initialValues = {
    aircraft: "",
    registration: "",
    is_91: false,
    is_135: false,
    is_121: false,
  };

  const create = (data) => {
    api
      .post("/api/tailnumbers/", data)
      .then(() => {
        navigation.navigate("FlightCreate");
        Context.setActivityVisible(false);
      })
      .catch(function (error) {
        console.log(error.response.data);
        Context.setActivityVisible(false);
        Alert.alert("An error occurred. \n Please try again.");
      });
  };
  return (
    <TailnumberForm
      method={create}
      initialValues={initialValues}
    ></TailnumberForm>
  );
}

const styles = StyleSheet.create({
  container: {},
});

export default TailnumberCreateScreen;
