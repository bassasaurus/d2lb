import axios from "axios";

import AsyncStorage from "@react-native-async-storage/async-storage";

axios.defaults.baseURL = "http://127.0.0.1:8000";

axios.defaults.headers.get["Accept"] = "application/json";
axios.defaults.headers.post["Accept"] = "application/json";

axios.interceptors.request.use(
  async (config) => {
    const token = await AsyncStorage.getItem("token");
    console.log(token);
    if (token) {
      config.headers.Authorization = "Token " + token;
    }
    return config;
  },
  (error) => {
    // console.log(error);
    return Promise.reject(error);
  }
);

const api = axios.create({});

export default api;
