import axios from "axios";

const instance = axios.create({
  baseURL: "https://c9cd5ef522ff.ngrok.io",
  timeout: 1000,
  headers: { Accept: "Application/json" },
});

export default instance;
