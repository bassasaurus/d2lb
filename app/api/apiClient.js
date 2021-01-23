import axios from "axios";

const instance = axios.create({
  baseURL: "https://bfb02aee6ce6.ngrok.io",
  timeout: 1000,
  headers: { Accept: "Application/json" },
});

export default instance;
