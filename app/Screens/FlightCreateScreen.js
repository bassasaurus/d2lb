import React, { useContext } from "react";
import FlightForm from "../components/FlightForm";
import AppContext from "../components/AppContext";
import { useNavigation } from "@react-navigation/native";
import storeAsyncObject from "../asyncStorage/storeAsyncObject";
import getAsyncObject from "../asyncStorage/getAsyncObject";



function FlightCreateScreen() {
  const Context = useContext(AppContext);
  const navigation = useNavigation();

  const addItemToArray = async (key, item) => {

    if (await AsyncStorage.getItem(key) === null){
        let array = []
        let offlineFlights = array.concat(item)
        
        storeAsyncObject(key, offlineFlights)
    }
    else {
        const array = await getAsyncObject(key)
        let newArray = array.concat(item)

        console.log(JSON.stringify(newArray, null, 2))
        
        storeAsyncObject(key, newArray)
    }
    
  };

  const initialValues = {
    date: "",
    route: "",
    aircraft_type: "",
    registration: "",
    duration: "",
    pilot_in_command: false,
    second_in_command: false,
    solo: false,
    dual: false,
    instructor: false,
    simulator: false,
    cross_country: false,
    landings_day: "",
    landings_night: "",
    instrument: "",
    simulated_instrument: "",
    night: "",
    approaches: [
      { approach_type: "", number: "" },
      { approach_type: "", number: "" },
      { approach_type: "", number: "" },
      { approach_type: "", number: "" },
    ],
    hold: false,
    remarks: "",
  };

  const create = async (data) => {
    
    addItemToArray('offlineFlights', data)
    
    navigation.navigate("FlightList");
    
  };

  return (
    <FlightForm method={create} initialValues={initialValues}></FlightForm>
  );
}

export default FlightCreateScreen;
