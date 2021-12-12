import React from "react";
import { StyleSheet, TouchableOpacity } from "react-native";

import { STYLES } from "../styles/styles";
import { MaterialCommunityIcons } from "@expo/vector-icons";

function RoundButton({ onPress, buttonSize, buttonColor }) {
  return (
    <TouchableOpacity
      style={[
        styles.container,
        { width: buttonSize, height: buttonSize, backgroundColor: buttonColor },
      ]}
      onPress={onPress}
    >
      <MaterialCommunityIcons name='plus' size={50} color={STYLES.white} />
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: "center",
    justifyContent: "center",
    position: "absolute",
    bottom: 50,
    right: 10,
    borderRadius: 100,
  },
});

export default RoundButton;
