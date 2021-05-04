import React from "react";
import { View, StyleSheet, Text } from "react-native";

function DetailScreen({ route }) {
  return (
    <View style={styles.container}>
      <Text>{route.params.id}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {},
});

export default DetailScreen;
