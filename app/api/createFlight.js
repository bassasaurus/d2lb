import api from "./axiosConfig";
import { useNavigation } from "@react-navigation/native";
import AppContext from "../components/AppContext";

const Context = AppContext;

const createFlight = (data) => {
  api
    .post("/api/flights/", data)
    .then(() => {
      navigation.navigate("FlightList");
      Context.setActivityVisible(false);
    })
    .catch(function (error) {
      console.log(error.response.data);
      Context.setActivityVisible(false);
      Alert.alert("An error occurred. \n Please try again.");
    });
};

export default createFlight;
