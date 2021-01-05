import axios from "axios";

const instance = axios.create({
  baseURL: "https://52b2d296006e.ngrok.io",
  timeout: 1000,
  headers: { Accept: "Application/json" },
});

export default instance;
