import api from "./axiosConfig";
import storeAsyncObject from "../asyncStorage/storeAsyncObject";

const fetchTailnumbers = async () => {
  const response = await api.get("/api/tailnumbers/");
  storeAsyncObject("tailnumbers_data", response.data.results);
};

export default fetchTailnumbers;
