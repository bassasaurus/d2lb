import React from "react";
import { View, StyleSheet, TextInput } from "react-native";
import { STYLES } from "../styles/styles";

function AppTextInput({ title, placeholder, isValid, onBlur, ...props }) {
  return (
    <View>
      <TextInput
        style={styles.input}
        title={title}
        placeholder={placeholder}
        borderColor={!isValid ? STYLES.red : STYLES.grey}
        onBlur={onBlur}
        {...props}
      ></TextInput>
    </View>
  );
}

const styles = StyleSheet.create({
  input: {
    paddingRight: 10,
    paddingLeft: 10,
    height: 40,
    marginTop: 10,
    borderWidth: 1,
    borderRadius: STYLES.borderRadius,
  },
});

export default AppTextInput;
