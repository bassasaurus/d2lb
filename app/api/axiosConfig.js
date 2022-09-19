import axios from "axios";
import * as Device from "expo-device";
import AsyncStorage from "@react-native-async-storage/async-storage";

if (process.env.NODE_ENV == "development") {
  if (Device.osName === "iOS") {
    axios.defaults.baseURL = "http://127.0.0.1:8000";
    // axios.defaults.baseURL = "https://www.direct2logbook.com";
  } else {
    axios.defaults.baseURL = "http://10.0.2.2:8000";
  }
} else {
  axios.defaults.baseURL = "https://www.direct2logbook.com";
}

axios.defaults.headers.get["Accept"] = "application/json";
axios.defaults.headers.post["Accept"] = "application/json";

const api = axios.create();

api.interceptors.request.use(
  async (config) => {
    const token = await AsyncStorage.getItem("token");
    if (token) {
      config.headers.Authorization = "Token " + token;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

export default api;
