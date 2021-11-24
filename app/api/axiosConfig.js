import axios from "axios";
import { Platform } from "react-native";

import AsyncStorage from "@react-native-async-storage/async-storage";

if (Platform.OS === "ios") {
  axios.defaults.baseURL = "http://127.0.0.1:8000";
  // axios.defaults.baseURL = "https://www.direct2logbook.com";
} else {
  axios.defaults.baseURL = "http://10.0.2.2:8000";
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
    console.log("error", error);
    return Promise.reject(error);
  }
);

export default api;
