import React from "react";
import { View, StyleSheet, Text } from "react-native";
import { STYLES } from "../styles/styles";

function AppText({ children, size, color }) {
  return <Text style={{ fontSize: size, color: color }}>{children}</Text>;
}

const styles = StyleSheet.create({
  text: {
    backgroundColor: "white",
  },
});

export default AppText;
