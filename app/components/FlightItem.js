import React from "react";
import { StyleSheet, View, Text } from "react-native";
import { STYLES } from "../styles/styles";

function FlightItem({ date, route, type, reg, dur, crew, dayL, nitL }) {
  return (
    <View style={styles.container}>
      <View style={styles.rect}>
        <View style={styles.firstColumn}>
          <Text style={styles.date}>{date}</Text>
          <Text style={styles.dayLdg}>Day Ldg {dayL}</Text>
          <Text style={styles.nightLdg}>Night Ldg {nitL}</Text>
        </View>
        <View style={styles.secondColumn}>
          <Text style={styles.route}>{route}</Text>
          <Text style={styles.duration}>Block: {dur}</Text>
          <Text style={styles.crew}>{crew}</Text>
        </View>
        <View style={styles.thirdColumn}>
          <Text style={styles.type}>{type}</Text>
        </View>

        <View style={styles.fourthColumn}>
          <Text style={styles.reg}>{reg}</Text>
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
    flexDirection: "row",
    width: "100%",
    marginBottom: 5,
    // paddingLeft: 5,
    // paddingRight: 5,
    // paddingTop: 10,
    // paddingBottom: 10,
    padding: STYLES.borderRadius,
    backgroundColor: STYLES.white,
    borderRadius: STYLES.borderRadius,
  },
  firstColumn: {
    flexDirection: "column",
    flex: 1.6,
  },
  secondColumn: {
    flexDirection: "column",
    flex: 3,
  },
  thirdColumn: {
    flexDirection: "column",
    flex: 1,
  },
  fourthColumn: {
    flexDirection: "column",
    flex: 1,
  },
  date: {
    fontFamily: STYLES.font,
    fontWeight: STYLES.fontWeightBold,
    fontSize: STYLES.fontSizeLarge,
    color: STYLES.blue,
    alignSelf: "flex-start",
    flex: 1,
  },
  type: {
    fontFamily: STYLES.font,
    fontWeight: STYLES.fontWeightBold,
    fontSize: STYLES.fontSizeLarge,
    color: STYLES.blue,
    alignSelf: "flex-start",
    flex: 1,
  },
  reg: {
    fontFamily: STYLES.font,
    fontWeight: STYLES.fontWeightBold,
    fontSize: STYLES.fontSizeLarge,
    color: STYLES.blue,
    marginLeft: 0,
    alignSelf: "flex-start",
    flex: 1,
  },
  duration: {
    fontFamily: STYLES.font,
    fontWeight: STYLES.fontWeightNormal,
    fontSize: STYLES.fontSizeNormal,
    color: STYLES.blue,
    alignSelf: "flex-start",
    flex: 1,
  },
  crew: {
    fontFamily: STYLES.font,
    fontWeight: STYLES.fontWeightNormal,
    fontSize: STYLES.fontSizeNormal,
    color: STYLES.blue,
    alignSelf: "flex-start",
    flex: 1,
  },
  route: {
    fontFamily: STYLES.font,
    fontWeight: STYLES.fontWeightBold,
    color: STYLES.blue,
    alignSelf: "flex-start",
    flex: 1,
  },
  dayLdg: {
    fontFamily: STYLES.font,
    fontWeight: STYLES.fontWeightNormal,
    fontSize: STYLES.fontSizeNormal,
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
    fontWeight: STYLES.fontWeightNormal,
    fontSize: STYLES.fontSizeNormal,
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
