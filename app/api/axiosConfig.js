import axios from "axios";
import * as Device from "expo-device";
import { session } from "../auth/session";
import { installSessionAuth } from "../auth/sessionAuth.mjs";

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

installSessionAuth(api, session);

export default api;
