import axios from "axios";

const instance = axios.create({
  baseURL: "https://8ac5b828edf2.ngrok.io",
  timeout: 1000,
  headers: { Accept: "Application/json" },
});

export default instance;
