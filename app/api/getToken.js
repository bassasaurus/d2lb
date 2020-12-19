import api from "./apiClient";

const getToken = (username, password) =>
  api({
    method: "post",
    url: "/api/token-auth/",
    data: {
      username: username,
      password: password,
    },
  }).then(function (response) {
    console.log(response.data);
    console.log(response.status);
    console.log(response.statusText);
    console.log(response.headers);
    console.log(response.config);
  });

export default getToken;
