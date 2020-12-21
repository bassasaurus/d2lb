import React, { useState } from "react";
import { View, StyleSheet, TextInput } from "react-native";

import AppButton from "../components/AppButton";
import getToken from "../api/getToken";

import "../asyncStorage/getData";
import getData from "../asyncStorage/getData";

function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  return (
    <View style={styles.container}>
      <TextInput
        title='email'
        placeholder='Email'
        onChangeText={(text) => setEmail(text)}
      ></TextInput>
      <TextInput
        title='password'
        placeholder='Password'
        onChangeText={(text) => setPassword(text)}
      ></TextInput>
      <AppButton title='Login' onPress={() => getData("token")} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: "center",
  },
});

export default Login;
