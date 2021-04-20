import axios from "axios";
import getAsyncData from "../asyncStorage/getAsyncData";

const getToken = async () => {
  const token = await getAsyncData("token");
};

const api_config = axios.create({
  baseURL: "https://8ac5b828edf2.ngrok.io",
  timeout: 1000,
  headers: {
    Accept: "Application/json",
    Authorization: `Token ${token}`,
  },
});

export default api_config;
