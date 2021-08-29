import React from "react";
import { View, StyleSheet, TouchableOpacity } from "react-native";
import Icon from "./Icon";
import { STYLES } from "../styles/styles";

function ApproachPickerButton({ onPress, buttonSize, buttonColor, iconName }) {
  const iconSize = buttonSize * 1.8;
  return (
    <TouchableOpacity
      style={[
        styles.container,
        { width: buttonSize, height: buttonSize, backgroundColor: buttonColor },
      ]}
      onPress={onPress}
    >
      <Icon name={iconName} size={iconSize} iconColor={STYLES.white} />
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    borderWidth: 1,
    borderColor: STYLES.white,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 100,
  },
});

export default ApproachPickerButton;
