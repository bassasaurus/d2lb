import React, { Component } from "react";
import { StyleSheet, View, Text } from "react-native";
import { STYLES } from "../styles/colors";

function FlightItem({ date }) {
  return (
    <View style={styles.container}>
      <View style={styles.rect}>
        <View style={styles.dateRow}>
          <Text style={styles.date}>Date</Text>
          <Text style={styles.type}>Type</Text>
          <Text style={styles.reg}>Reg</Text>
          <Text style={styles.duration}>Duration</Text>
          <Text style={styles.crew}>Crew</Text>
        </View>
        <View style={styles.routeRow}>
          <Text style={styles.route}>Route</Text>
          <Text style={styles.loremIpsum}></Text>
          <Text style={styles.dayLdg}>Day Ldg</Text>
        </View>
        <View style={styles.crossCountryRow}>
          <Text style={styles.crossCountry}>Cross Country</Text>
          <Text style={styles.night}>Night</Text>
          <Text style={styles.inst}>Inst</Text>
          <Text style={styles.nightLdg}>Night Ldg</Text>
        </View>
        <View style={styles.cfiRow}>
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
    height: 100,
    backgroundColor: STYLES.itemBackground,
    marginTop: 0,
  },
  date: {
    fontFamily: "roboto-regular",
    color: STYLES.blue,
  },
  type: {
    fontFamily: "roboto-regular",
    color: STYLES.blue,
    marginLeft: 45,
  },
  reg: {
    fontFamily: "roboto-regular",
    color: STYLES.blue,
    marginLeft: 27,
  },
  duration: {
    fontFamily: "roboto-regular",
    color: STYLES.blue,
    marginLeft: 36,
  },
  crew: {
    fontFamily: "roboto-regular",
    color: STYLES.blue,
    marginLeft: 32,
  },
  dateRow: {
    height: 16,
    flexDirection: "row",
    marginLeft: 5,
    marginRight: 65,
  },
  route: {
    fontFamily: "roboto-regular",
    color: STYLES.blue,
  },
  loremIpsum: {
    fontFamily: "roboto-regular",
    color: "#121212",
    marginLeft: 34,
  },
  dayLdg: {
    fontFamily: "roboto-regular",
    color: STYLES.blue,
    marginLeft: 203,
  },
  routeRow: {
    height: 16,
    flexDirection: "row",
    marginTop: 3,
    marginLeft: 5,
    marginRight: 47,
  },
  crossCountry: {
    fontFamily: "roboto-regular",
    color: STYLES.blue,
    marginTop: 1,
  },
  night: {
    fontFamily: "roboto-regular",
    color: STYLES.blue,
    marginLeft: 41,
  },
  inst: {
    fontFamily: "roboto-regular",
    color: STYLES.blue,
    fontSize: 14,
    marginLeft: 35,
    marginTop: 1,
  },
  nightLdg: {
    fontFamily: "roboto-regular",
    color: STYLES.blue,
    marginLeft: 51,
  },
  crossCountryRow: {
    height: 17,
    flexDirection: "row",
    marginTop: 4,
    marginLeft: 5,
    marginRight: 37,
  },
  cfi: {
    fontFamily: "roboto-regular",
    color: STYLES.blue,
  },
  dual: {
    fontFamily: "roboto-regular",
    color: STYLES.blue,
    marginLeft: 24,
    marginTop: 2,
  },
  solo: {
    fontFamily: "roboto-regular",
    color: STYLES.blue,
    marginLeft: 30,
    marginTop: 2,
  },
  hood: {
    fontFamily: "roboto-regular",
    color: STYLES.blue,
    marginLeft: 69,
    marginTop: 2,
  },
  sim: {
    fontFamily: "roboto-regular",
    color: STYLES.blue,
    marginLeft: 42,
    marginTop: 2,
  },
  cfiRow: {
    height: 18,
    flexDirection: "row",
    marginTop: 5,
    marginLeft: 5,
    marginRight: 72,
  },
});

export default FlightItem;
