import axios from "axios";
import Platform from "react-native";

import AsyncStorage from "@react-native-async-storage/async-storage";

axios.defaults.baseURL = "https://393c14265d6b.ngrok.io";

axios.defaults.headers.get["Accept"] = "application/json";
axios.defaults.headers.post["Accept"] = "application/json";

const api = axios.create();
api.interceptors.request.use(
  async (config) => {
    const token = await AsyncStorage.getItem("token");
    // console.log(token);
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
