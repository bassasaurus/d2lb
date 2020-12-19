import React, { useState } from "react";
import { View, StyleSheet, TextInput, Button } from "react-native";
import getToken from "../api/getToken";

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
      <Button title='Login' onPress={() => getToken(email, password)} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: "center",
  },
  input: {
    alignItems: "center",
    width: 200,
    height: 30,
  },
});

export default Login;
