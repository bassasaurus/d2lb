import api from "./axiosConfig";
import storeData from "../asyncStorage/storeAsyncData";
import removeAsyncData from "../asyncStorage/removeAsyncData";

const getApiToken = (username, password) => {
  console.log(username, password);

  const isSignedIn = createContext(false);

  removeAsyncData("token");

  api({
    method: "post",
    url: "/api/token-auth/",
    data: {
      username: username,
      password: password,
    },
  })
    .then(function (response) {
      storeData("token", response.data["token"]);
      console.log(response.data["token"]);
      // console.log(response.status);
      // console.log(response.statusText);
      // console.log(response.headers);
      // console.log(response.config);
    })

    .catch(function (error) {
      if (error.response) {
        // The request was made and the server responded with a status code
        // that falls out of the range of 2xx
        // console.log(error.response.data);
        // console.log(error.response.status);
        // console.log(error.response.headers);
      } else if (error.request) {
        // The request was made but no response was received
        // `error.request` is an instance of XMLHttpRequest in the browser and an instance of
        // http.ClientRequest in node.js
        // console.log(error.request);
      } else {
        // Something happened in setting up the request that triggered an Error
        // console.log("Error", error.message);
      }
      // console.log(error.config);
    });
};

export default getApiToken;
