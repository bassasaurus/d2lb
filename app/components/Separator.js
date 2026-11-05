import { useAppTheme } from '../theme/ThemeProvider';
import React from "react";
import { View, StyleSheet } from "react-native";

function Separator(props) {
  const { colors } = useAppTheme();
  return (
    <View style={styles.container}>
      <View backgroundColor={colors.border} height={1} width='100%'></View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    paddingBottom: 10,
  },
});

export default Separator;
