import React, { useContext } from "react";
import { StyleSheet, Alert } from "react-native";
import api from "../api/axiosConfig";
import AppContext from "../components/AppContext";
import TailnumberForm from "../components/TailnumberForm";
import storeAsyncObject from "../asyncStorage/storeAsyncObject";
import removeAsyncObject from "../asyncStorage/removeAsyncObject";

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
      .then((response) => {
        navigation.navigate("FlightCreate");
        Context.setActivityVisible(false);
        // use response.data to reassign AsyncStorage variable
        removeAsyncObject("tailnumbers_data");
        storeAsyncObject("tailnumbers_data", response.data);
      })
      .catch(function (error) {
        // console.log(error.response.data);
        Context.setActivityVisible(false);
        e;
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
