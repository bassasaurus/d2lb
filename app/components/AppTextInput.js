import React from "react";
import { View, StyleSheet, TextInput } from "react-native";

function AppTextInput({ title, placeholder, ...props }) {
  return (
    <View style={styles.container}>
      <TextInput
        style={styles.input}
        title={title}
        placeholder={placeholder}
        {...props}
      ></TextInput>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: "center",
    justifyContent: "center",
  },
  input: {
    alignItems: "center",
    width: 200,
    height: 30,
  },
});

export default AppTextInput;
