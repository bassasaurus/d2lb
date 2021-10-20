import React, { useState, useContext } from "react";
import { View, StyleSheet } from "react-native";
import { STYLES } from "../styles/styles";
import AppButton from "../components/AppButton";
import AppTextInput from "../components/AppTextInput";
import api from "../api/axiosConfig";
import storeData from "../asyncStorage/storeAsyncData";
import removeAsyncData from "../asyncStorage/removeAsyncData";
import AppContext from "../components/AppContext";

function LoginScreen() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const Context = useContext(AppContext);
  console.log(Context);
  const getApiToken = (username, password) => {
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
        Context.setIsSignedIn(true);
      })

      .catch(function (error) {
        if (error.response) {
        } else if (error.request) {
        } else {
        }
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
