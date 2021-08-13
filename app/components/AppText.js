import React from "react";
import { View, StyleSheet, Text } from "react-native";
import { STYLES } from "../styles/styles";

function AppText({ children, ...props }) {
  return <Text style={styles.text}>{children}</Text>;
}

const styles = StyleSheet.create({
  text: {
    fontFamily: STYLES.font,
    fontSize: STYLES.fontSizeNormal,
  },
});

export default AppText;
