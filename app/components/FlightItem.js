import React from "react";
import { StyleSheet, View, Text } from "react-native";
import { STYLES } from "../styles/styles";
import AppText from "../components/AppText";

function FlightItem({ date, route, type, reg, dur, crew, dayL, nitL }) {
  return (
    <>
      <View style={styles.itemContainer}>
        <View style={styles.rowContainer}>
          <View style={styles.firstColumn}>
            <AppText size={18} color={STYLES.blue}>
              {date}
            </AppText>
          </View>
          <View style={styles.secondColumn}>
            <View style={{ flex: 1, flexDirection: "row" }}>
              <AppText size={18} color={STYLES.blue}>
                {type}
              </AppText>
              <AppText>{"  "}</AppText>
              <AppText size={18} color={STYLES.blue}>
                {reg}
              </AppText>
            </View>
          </View>
          <View style={styles.rowContainer}>
            <View style={styles.thirdColumn}>
              <AppText size={18} color={STYLES.black}>
                {dur}
              </AppText>
            </View>
          </View>
        </View>

        <View style={styles.rowContainer}>
          <View style={styles.firstColumn}>
            <AppText size={18} color={STYLES.black}>
              {route}
            </AppText>
          </View>
          <View style={styles.thirdColumn}></View>
        </View>
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  itemContainer: {
    width: "100%",
    marginTop: 5,
    paddingTop: 5,
    paddingLeft: 5,
    paddingRight: 5,
    backgroundColor: STYLES.white,
  },
  rowContainer: {
    flex: 1,
    flexDirection: "row",
    marginBottom: 5,
  },
  firstColumn: {
    flexDirection: "column",
  },
  secondColumn: {
    flex: 2.7,
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
  },
  thirdColumn: {
    flex: 1,
    flexDirection: "column",
    alignItems: "flex-end",
  },
});

export default FlightItem;
