import api from "./axiosConfig";
import storeAsyncObject from "../asyncStorage/storeAsyncObject";
import removeAsyncData from "../asyncStorage/removeAsyncData";

const fetchTailnumbers = async () => {
  const response = await api.get("/api/tailnumbers/");
  removeAsyncData("tailnumbers_data");
  storeAsyncObject("tailnumbers_data", response.data.results);
};

export default fetchTailnumbers;
