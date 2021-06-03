import React, { Component } from "react";
import { StyleSheet, View, Text } from "react-native";
import { STYLES } from "../styles/styles";

function FlightItem({ date, route, type, reg, dur }) {
  return (
    <View style={styles.container}>
      <View style={styles.rect}>
        <View style={styles.firstRow}>
          <Text style={styles.date}>{date}</Text>
          <Text style={styles.type}>{type}</Text>
          <Text style={styles.reg}>{reg}</Text>
          <Text style={styles.duration}>{dur}</Text>
          <Text style={styles.crew}>Crew</Text>
        </View>
        <View style={styles.secondRow}>
          <Text style={styles.route}>{route}</Text>
          <Text style={styles.dayLdg}>Day Ldg</Text>
          <Text style={styles.nightLdg}>Night Ldg</Text>
        </View>
        <View style={styles.thirdRow}>
          <Text style={styles.crossCountry}>Cross Country</Text>
          <Text style={styles.night}>Night</Text>
          <Text style={styles.inst}>Inst</Text>
        </View>
        <View style={styles.fourthRow}>
          <Text style={styles.cfi}>CFI</Text>
          <Text style={styles.dual}>Dual</Text>
          <Text style={styles.solo}>Solo</Text>
          <Text style={styles.hood}>Hood</Text>
          <Text style={styles.sim}>Sim</Text>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  rect: {
    width: "100%",
    marginTop: 20,
    marginBottom: 10,
    backgroundColor: STYLES.itemBackground,
    marginTop: 0,
  },
  date: {
    fontFamily: STYLES.font,
    color: STYLES.blue,
  },
  type: {
    fontFamily: STYLES.font,
    color: STYLES.blue,
    marginLeft: 0,
  },
  reg: {
    fontFamily: STYLES.font,
    color: STYLES.blue,
    marginLeft: 0,
  },
  duration: {
    fontFamily: STYLES.font,
    color: STYLES.blue,
    marginLeft: 0,
  },
  crew: {
    fontFamily: STYLES.font,
    color: STYLES.blue,
    marginLeft: 0,
  },
  firstRow: {
    height: 16,
    flexDirection: "row",
    marginLeft: 0,
    marginRight: 0,
  },
  route: {
    fontFamily: STYLES.font,
    color: STYLES.blue,
    marginRight: 0,
  },
  dayLdg: {
    fontFamily: STYLES.font,
    color: STYLES.blue,
    marginLeft: 0,
  },
  secondRow: {
    height: 16,
    flexDirection: "row",
    marginTop: 3,
    marginLeft: 5,
    marginRight: 47,
  },
  crossCountry: {
    fontFamily: STYLES.font,
    color: STYLES.blue,
    marginTop: 1,
  },
  night: {
    fontFamily: STYLES.font,
    color: STYLES.blue,
    marginLeft: 41,
  },
  inst: {
    fontFamily: STYLES.font,
    color: STYLES.blue,
    fontSize: 14,
    marginLeft: 35,
    marginTop: 1,
  },
  nightLdg: {
    fontFamily: STYLES.font,
    color: STYLES.blue,
    marginLeft: 51,
  },
  thirdRow: {
    height: 17,
    flexDirection: "row",
    marginTop: 4,
    marginLeft: 5,
    marginRight: 37,
  },
  cfi: {
    fontFamily: STYLES.font,
    color: STYLES.blue,
  },
  dual: {
    fontFamily: STYLES.font,
    color: STYLES.blue,
    marginLeft: 24,
    marginTop: 2,
  },
  solo: {
    fontFamily: STYLES.font,
    color: STYLES.blue,
    marginLeft: 30,
    marginTop: 2,
  },
  hood: {
    fontFamily: STYLES.font,
    color: STYLES.blue,
    marginLeft: 69,
    marginTop: 2,
  },
  sim: {
    fontFamily: STYLES.font,
    color: STYLES.blue,
    marginLeft: 42,
    marginTop: 2,
  },
  fourthRow: {
    height: 18,
    flexDirection: "row",
    marginTop: 5,
    marginLeft: 5,
    marginRight: 72,
  },
});

export default FlightItem;
