import React, { useContext } from "react";
import api from "./axiosConfig.js";
import AppContext from "../components/AppContext.js";

async function handleFlightData() {
 

 const getSyncedData = async () => {

  const Context = useContext(AppContext);

  try {

    const response = await api.get("/api/flights/");
    console.log(response.data.results)
    // Context.setSyncedFlightData(response.data.results);
    console.log(Context.syncedFlightDataValue);

  } catch (error) {

  console.log(error);

  }
};

return {
getSyncedData,
};
}

export default handleFlightData;

