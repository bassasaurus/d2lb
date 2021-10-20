import React, { useState } from "react";
import { View, StyleSheet } from "react-native";
import { STYLES } from "../styles/styles";
import AppButton from "../components/AppButton";
import AppTextInput from "../components/AppTextInput";
import api from "../api/axiosConfig";
import storeData from "../asyncStorage/storeAsyncData";
import removeAsyncData from "../asyncStorage/removeAsyncData";

function LoginScreen() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");

  const getApiToken = (username, password) => {
    console.log(username, password);

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

  return (
    <View style={styles.container}>
      <AppTextInput
        title='username'
        placeholder='Email'
        onChangeText={(text) => setUsername(text)}
        textContentType='emailAddress'
      />
      <AppTextInput
        title='password'
        placeholder='Password'
        onChangeText={(text) => setPassword(text)}
        textContentType='password'
        secureTextEntry={true}
      />
      <AppButton
        title='Login'
        onPress={() => getApiToken(username, password)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: "center",
  },
});

export default LoginScreen;
