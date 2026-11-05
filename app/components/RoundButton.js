import { useMemo } from 'react';
import React from "react";
import { StyleSheet, TouchableOpacity } from "react-native";

import { useAppTheme } from '../theme/ThemeProvider';
import { MaterialCommunityIcons } from "@expo/vector-icons";

function RoundButton({ onPress, buttonSize, buttonColor }) {
  const { styles: STYLES } = useAppTheme();
  const styles = useMemo(() => createStyles(STYLES), [STYLES]);
  return (
    <TouchableOpacity
      style={[
        styles.container,
        { width: buttonSize, height: buttonSize, backgroundColor: buttonColor },
      ]}
      onPress={onPress}
    >
      <MaterialCommunityIcons name='plus' size={50} color={STYLES.onAction} />
    </TouchableOpacity>
  );
}

const createStyles = STYLES => StyleSheet.create({
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
