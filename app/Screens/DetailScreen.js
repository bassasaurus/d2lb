import React from "react";
import { View, StyleSheet, Text } from "react-native";

function DetailScreen({ route }) {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>{route.params.item.id}</Text>
      <Text style={styles.title}>{route.params.item.date}</Text>
      <Text style={styles.title}>{route.params.item.route}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  title: {
    fontSize: 16,
    justifyContent: "space-between",
    color: "mediumblue",
  },
});

export default DetailScreen;
