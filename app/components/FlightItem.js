import React from "react";
import { StyleSheet, View, Text } from "react-native";
import { STYLES } from "../styles/styles";

function FlightItem({ date, route, type, reg, dur, crew, dayL, nitL }) {
  return (
    <View style={styles.container}>
      <View style={styles.row}>
        <View style={styles.firstColumn}>
          <Text style={styles.text}>{date}</Text>
        </View>
        <View style={styles.secondColumn}>
          <Text style={styles.text}>{route}</Text>
        </View>
        <View style={styles.thirdColumn}>
          <Text style={styles.text}>{type}</Text>
          <Text style={styles.text}>{reg}</Text>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    flexDirection: "row",
  },
  row: {
    flexDirection: "row",
    width: "100%",
    marginBottom: 5,
    // paddingLeft: 5,
    // paddingRight: 5,
    // paddingTop: 10,
    paddingBottom: 5,
    padding: STYLES.borderRadius,
    backgroundColor: STYLES.white,
    borderRadius: STYLES.borderRadius,
  },
  firstColumn: { flex: 0.6, flexDirection: "column", alignItems: "flex-start" },
  secondColumn: { flex: 1, flexDirection: "column", alignItems: "flex-start" },
  thirdColumn: { flex: 1, flexDirection: "column", alignItems: "flex-end" },

  text: {
    fontSize: 15,
    color: STYLES.blue,
  },
});

export default FlightItem;
