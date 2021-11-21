import React from "react";
import { View, StyleSheet, Text } from "react-native";
import { STYLES } from "../styles/styles";

function AppText({ children, size, color, weight, ...props }) {
  return (
    <Text
      style={{
        fontSize: size,
        color: color,
        fontWeight: weight,
      }}
    >
      {children}
    </Text>
  );
}

const styles = StyleSheet.create({});

export default AppText;
