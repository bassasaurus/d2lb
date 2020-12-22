import React, { useState } from "react";
import { View, StyleSheet, TextInput } from "react-native";

import AppButton from "../components/AppButton";
import AppTextInput from "../components/AppTextInput";
import getToken from "../api/getToken";

import getData from "../asyncStorage/getData";

function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  return (
    <View style={styles.container}>
      <AppTextInput
        title='email'
        placeholder='Email'
        onChangeText={(text) => setEmail(text)}
        textContentType='emailAddress'
      />
      <AppTextInput
        title='password'
        placeholder='Password'
        onChangeText={(text) => setPassword(text)}
        textContentType='password'
        secureTextEntry={true}
      />
      <AppButton title='Login' onPress={() => getToken(email, password)} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: "center",
  },
});

export default Login;
