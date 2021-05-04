import React from "react";
import { View, StyleSheet, Text } from "react-native";

function DetailScreen({ route }) {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>{route.params.item.id}</Text>
      <Text style={styles.title}>{route.params.item.date}</Text>
      <Text style={styles.title}>{route.params.item.aircraft_type}</Text>
      <Text style={styles.title}>{route.params.item.registration}</Text>
      <Text style={styles.title}>{route.params.item.route}</Text>
      <Text style={styles.title}>{route.params.item.remarks}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: "100%",
    flex: 1,
  },
  title: {
    fontSize: 24,
    color: "mediumblue",
  },
});

export default DetailScreen;
