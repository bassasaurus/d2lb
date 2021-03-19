import instance from "./apiClient";

import getAsyncData from "../asyncStorage/getAsyncData";

const getFlights = async () => {
  const token = await getAsyncData("token");

  instance({
    method: "get",
    url: "/api/flights/",
    headers: {
      Authorization: `Token ${token}`,
    },
  })
    .then(async function (response) {
      console.log(response.data.results);
      // console.log(response.status);
      // console.log(response.statusText);
      // console.log(response.headers);
      // console.log(response.config);
      const data = await response.data.results;
      return data;
    })
    .catch(function (error) {
      if (error.response) {
        // The request was made and the server responded with a status code
        // that falls out of the range of 2xx
        // console.log(error.response.data);
        // console.log(error.response.status);
        // console.log(error.response.headers);
        alert(error.response);
      } else if (error.request) {
        // The request was made but no response was received
        // `error.request` is an instance of XMLHttpRequest in the browser and an instance of
        // http.ClientRequest in node.js
        console.log(error.request);
      } else {
        // Something happened in setting up the request that triggered an Error
        console.log("Error", error.message);
      }
      console.log(error.config);
    });
};

export default getFlights;
