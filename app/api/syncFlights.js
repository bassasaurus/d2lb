import api from "../api/axiosConfig"
import removeAsyncData from "../asyncStorage/removeAsyncData";
import storeAsyncObject from "../asyncStorage/storeAsyncObject";
import NetInfo from "@react-native-community/netinfo";

const syncFlights = async () => {
    const response = await api.get("/api/flights/");
    removeAsyncData("flights_data");
    storeAsyncObject("flights_data", response.data.results);

    console.log("syncFlights")
  };

export default syncFlights;