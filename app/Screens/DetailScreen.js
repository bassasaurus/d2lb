import React from "react";
import { View, StyleSheet, Text } from "react-native";

function DetailScreen({ id, ...props }) {
  return (
    <View style={styles.container}>
      <Text>{id}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {},
});

export default DetailScreen;
