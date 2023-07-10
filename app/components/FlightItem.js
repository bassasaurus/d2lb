import React from "react";
import { StyleSheet, View, Text } from "react-native";
import { STYLES } from "../styles/styles";
import AppText from "../components/AppText";
import { backgroundColor } from "styled-system";

function FlightItem({ id, date, route, type, reg, dur, crew, dayL, nitL }) {
  return (
    <>
      <View style={{...styles.itemContainer,
                    backgroundColor: id ? "white" : "gray"
                    }}>
        <View style={styles.rowContainer}>
          <View style={styles.firstColumn}>
            <AppText size={16} color={STYLES.blue} weight='bold'>
              {date}
            </AppText>
          </View>
          <View style={styles.secondColumn}>
            <View style={{ flex: 1, flexDirection: "row" }}>
              <AppText size={16} color={STYLES.blue} weight='bold'>
                {type}
              </AppText>
              <AppText>{"  "}</AppText>
              <AppText size={16} color={STYLES.blue} weight='bold'>
                {reg}
              </AppText>
            </View>
          </View>
          <View style={styles.rowContainer}>
            <View style={styles.thirdColumn}>
              <AppText size={16} color={STYLES.blue} weight='bold'>
                {dur}
              </AppText>
            </View>
          </View>
        </View>

        <View style={styles.rowContainer}>
          <View style={styles.firstColumn}>
            <AppText size={16} color={STYLES.black}>
              {route}
            </AppText>
          </View>
          <View style={styles.thirdColumn}>
            <AppText color={STYLES.black}>{crew}</AppText>
          </View>
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
  },
  rowContainer: {
    flex: 1,
    flexDirection: "row",
    marginBottom: 5,
  },
  firstColumn: {
    flex: 1.1,
    flexDirection: "column",
  },
  secondColumn: {
    flex: 2,
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
