import React from "react";
import { StyleSheet, View, Text } from "react-native";
import { STYLES } from "../styles/styles";

function FlightItem({ date, route, type, reg, dur, crew, dayL, nitL }) {
  return (
    <View style={styles.container}>
      <View style={styles.rect}>
        <View style={styles.firstRow}>
          <Text style={styles.date}>{date}</Text>
          <Text style={styles.type}>{type}</Text>
          <Text style={styles.reg}>{reg}</Text>
          <Text style={styles.duration}>Block: {dur}</Text>
          <Text style={styles.crew}>{crew}</Text>
        </View>
        <View style={styles.secondRow}>
          <Text style={styles.route}>{route}</Text>
          <Text style={styles.dayLdg}>Day Ldg {dayL}</Text>
          <Text style={styles.nightLdg}>Night Ldg {nitL}</Text>
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
    flexDirection: "row",
  },
  rect: {
    flexDirection: "column",
    width: "100%",
    marginBottom: 5,
    paddingLeft: 5,
    paddingRight: 5,
    paddingTop: 0,
    backgroundColor: STYLES.white,
  },
  firstRow: {
    flexDirection: "row",
  },
  secondRow: {
    flexDirection: "row",
  },
  thirdRow: {
    flexDirection: "row",
  },
  fourthRow: {
    flexDirection: "row",
  },
  date: {
    fontFamily: STYLES.font,
    fontWeight: STYLES.bold,
    color: STYLES.blue,
    alignSelf: "flex-start",
    flex: 1,
  },
  type: {
    fontFamily: STYLES.font,
    fontWeight: STYLES.bold,
    color: STYLES.blue,
    alignSelf: "flex-start",
    flex: 1,
  },
  reg: {
    fontFamily: STYLES.font,
    fontWeight: STYLES.bold,
    color: STYLES.blue,
    marginLeft: 0,
    alignSelf: "flex-start",
    flex: 1,
  },
  duration: {
    fontFamily: STYLES.font,
    fontWeight: STYLES.bold,
    color: STYLES.blue,
    alignSelf: "flex-start",
    flex: 1,
  },
  crew: {
    fontFamily: STYLES.font,
    fontWeight: STYLES.bold,
    color: STYLES.blue,
    alignSelf: "flex-start",
    flex: 1,
  },
  route: {
    fontFamily: STYLES.font,
    fontWeight: STYLES.bold,
    color: STYLES.blue,
    alignSelf: "flex-start",
    flex: 1,
  },
  dayLdg: {
    fontFamily: STYLES.font,
    color: STYLES.blue,
    alignSelf: "flex-start",
    flex: 1,
  },
  crossCountry: {
    fontFamily: STYLES.font,
    color: STYLES.blue,
    alignSelf: "flex-start",
    flex: 1,
  },
  night: {
    fontFamily: STYLES.font,
    color: STYLES.blue,
    alignSelf: "flex-start",
    flex: 1,
  },
  inst: {
    fontFamily: STYLES.font,
    color: STYLES.blue,
    alignSelf: "flex-start",
    flex: 1,
  },
  nightLdg: {
    fontFamily: STYLES.font,
    color: STYLES.blue,
    alignSelf: "flex-start",
    flex: 1,
  },
  cfi: {
    fontFamily: STYLES.font,
    color: STYLES.blue,
  },
  dual: {
    fontFamily: STYLES.font,
    color: STYLES.blue,
    alignSelf: "flex-start",
    flex: 1,
  },
  solo: {
    fontFamily: STYLES.font,
    color: STYLES.blue,
    alignSelf: "flex-start",
    flex: 1,
  },
  hood: {
    fontFamily: STYLES.font,
    color: STYLES.blue,
    alignSelf: "flex-start",
    flex: 1,
  },
  sim: {
    fontFamily: STYLES.font,
    color: STYLES.blue,
    alignSelf: "flex-start",
    flex: 1,
  },
});

export default FlightItem;
