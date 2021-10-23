import React, { useState, useContext } from "react";
import { View, StyleSheet } from "react-native";
import { STYLES } from "../styles/styles";
import AppButton from "../components/AppButton";
import AppTextInput from "../components/AppTextInput";
import api from "../api/axiosConfig";
import storeData from "../asyncStorage/storeAsyncData";
import removeAsyncData from "../asyncStorage/removeAsyncData";
import AppContext from "../components/AppContext";
import ActivityModal from "../components/ActivityModal";

function LoginScreen() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const Context = useContext(AppContext);

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
        Context.setActivityVisible(false);
      })
      .catch(function (error) {
        Context.setActivityVisible(false);
        Context.setIsSignedIn(false);
        if (error.response) {
        } else if (error.request) {
        } else {
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
          onPress={() => {
            getApiToken(username, password);
            Context.setActivityVisible(true);
          }}
        />
      </View>
      <ActivityModal visible={Context.activityVisibleValue}></ActivityModal>
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
