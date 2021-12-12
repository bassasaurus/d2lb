import React from "react";
import { View, StyleSheet } from "react-native";

function Separator(props) {
  return (
    <View style={styles.container}>
      <View backgroundColor='gray' height={1} width='100%'></View>
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
