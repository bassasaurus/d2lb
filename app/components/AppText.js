import React from "react";
import { View, StyleSheet, Text } from "react-native";
import { STYLES } from "../styles/styles";

function AppText({ children, ...props }) {
  return (
    <Text style={styles.text} {...props}>
      {children}
    </Text>
  );
}

const styles = StyleSheet.create({
  text: {
    fontFamily: "sans-serif",
    fontSize: STYLES.fontSizeNormal,
  },
});

export default AppText;
