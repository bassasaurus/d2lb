import React from "react";
import { View, StyleSheet, Text } from "react-native";
import { fontSize } from "styled-system";
import { STYLES } from "../styles/styles";

function AppText({ children, size, color }) {
  return <Text style={((fontSize: size), (color: color))}>{children}</Text>;
}

export default AppText;
