import api from "./axiosConfig.js"



const syncData = async () => {
    const response = await api.get("/api/flights/");
    Context.setSyncedFlightData(response.data.results);
  };