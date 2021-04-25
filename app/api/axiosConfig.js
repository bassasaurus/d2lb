import axios from "axios";
import getAsyncData from "../asyncStorage/getAsyncData";

axios.defaults.baseURL = "https://2a6e18fcf163.ngrok.io";

axios.defaults.headers.get["Accept"] = "application/json";
axios.defaults.headers.post["Accept"] = "application/json";

axios.interceptors.request.use(
  async (config) => {
    const token = await AsyncStorage.getItem("token");
    if (token) {
      console.log(token);
      config.headers.Authorization = "Token " + token;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

const instance = axios.create();

export default instance;
