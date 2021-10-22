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
          Context.setIsSignedIn(false);
        } else if (error.request) {
          Context.setIsSignedIn(false);
        } else {
          Context.setIsSignedIn(false);
        }
      });
  };

  return (
    <View style={styles.container}>
      <View style={styles.input}>
        <AppTextInput
          title='username'
          placeholder='Email'
          onChangeText={(text) => setUsername(text)}
          textContentType='emailAddress'
          isValid={true}
          autoCapitalize={false}
          clearButtonMode='always'
        />
      </View>
      <View style={styles.input}>
        <AppTextInput
          title='password'
          placeholder='Password'
          onChangeText={(text) => setPassword(text)}
          textContentType='password'
          secureTextEntry={true}
          isValid={true}
          clearButtonMode='always'
        />
      </View>
      <View>
        <AppButton
          title='Login'
          onPress={() => getApiToken(username, password)}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingTop: 300,
    flexDirection: "column",
    justifyContent: "center",
    alignItems: "center",
    width: "100%",
  },
  input: {
    width: "60%",
  },
});

export default LoginScreen;
