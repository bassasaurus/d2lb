import axios from "axios";

const instance = axios.create({
  baseURL: "https://26c072a7111d.ngrok.io",
  timeout: 1000,
  headers: { Accept: "Application/json" },
});

export default instance;
