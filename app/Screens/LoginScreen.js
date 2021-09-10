import React, { useState } from "react";
import { View, StyleSheet, TextInput } from "react-native";

import { STYLES } from "../styles/styles";

import AppButton from "../components/AppButton";
import AppTextInput from "../components/AppTextInput";
import getApiToken from "../api/getApiToken";

function Login() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");

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

export default Login;
