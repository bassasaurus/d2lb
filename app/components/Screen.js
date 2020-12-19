import React from "react";
import { View, StyleSheet, SafeAreaView } from "react-native";

function Screen(props) {
  return <SafeAreaView style={styles.container}></SafeAreaView>;
}

const styles = StyleSheet.create({
  container: {
    alignItems: "center",
    justifyContent: "center",
  },
});

export default Screen;
