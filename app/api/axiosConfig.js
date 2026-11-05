import axios from "axios";
import * as Device from "expo-device";
import AsyncStorage from "@react-native-async-storage/async-storage";

import { Platform } from "react-native";
import { getApiBaseURL } from "./baseURL.mjs";

const api = axios.create({
  baseURL: getApiBaseURL({
    platform: Platform.OS,
    isDevice: Device.isDevice,
    override: process.env.EXPO_PUBLIC_API_URL,
  }),
  timeout: 15000,
  headers: { Accept: "application/json" },
});

api.interceptors.request.use(
  async (config) => {
    const token = config.pinnedToken || await AsyncStorage.getItem("token");
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
