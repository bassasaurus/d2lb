import React from "react";
import { View, StyleSheet, TextInput } from "react-native";
import { STYLES } from "../styles/styles";

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
  container: {},
  input: {
    paddingLeft: 10,
    width: "95%",
    height: 40,
    marginTop: 10,
    borderWidth: 1,
    borderRadius: STYLES.borderRadius,
    borderColor: STYLES.grey,
  },
});

export default AppTextInput;
