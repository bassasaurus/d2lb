import React from "react";
import { View, StyleSheet } from "react-native";
import AppText from "./AppText";
import { STYLES } from "../styles/styles";

function DetailsPanel({ route }) {
  const approaches = route.params.item.approaches;
  return (
    <View>
      <View style={styles.rowContainer}>
        <View style={styles.firstColumn}>
          <AppText size={16} color={STYLES.black}>
            {route.params.item.route}
          </AppText>
        </View>
        <View style={styles.thirdColumn}>
          <AppText size={16} color={STYLES.black}>
            {route.params.item.pilot_in_command ? "PIC" : ""}
            {route.params.item.second_in_command ? "SIC" : ""}
            {route.params.item.solo ? "Solo" : ""}
            {route.params.item.dual ? "Dual" : ""}
          </AppText>
        </View>
      </View>
      {/* third row */}
      <View style={styles.rowContainer}>
        <View style={styles.firstColumn}>
          <View style={styles.rowContainer}>
            <AppText size={16} color={STYLES.black}>
              Landings:{" "}
            </AppText>
            {route.params.item.landings_day ? (
              <AppText size={16} color={STYLES.black}>
                Day {route.params.item.landings_day}{" "}
              </AppText>
            ) : null}
            {route.params.item.landings_night ? (
              <AppText size={16} color={STYLES.black}>
                Night {route.params.item.landings_night}{" "}
              </AppText>
            ) : null}
          </View>
        </View>
        <View style={styles.secondColumn}></View>
        <View style={styles.thirdColumn}>
          <AppText size={16} color={STYLES.black}>
            {route.params.item.instructor ? "  CFI" : ""}
          </AppText>
        </View>
      </View>
      {/* fourth row */}
      <View style={styles.rowContainer}>
        <View style={styles.firstColumn}>
          <View style={styles.rowContainer}>
            <AppText size={16} color={STYLES.black}>
              Conditions:{" "}
            </AppText>
            {route.params.item.night ? (
              <AppText size={16} color={STYLES.black}>
                Night {route.params.item.night}
                {"  "}
              </AppText>
            ) : null}
            {route.params.item.instrument ? (
              <AppText size={16} color={STYLES.black}>
                Inst {route.params.item.instrument}
                {"  "}
              </AppText>
            ) : null}
            {route.params.item.simulated_instrument ? (
              <AppText size={16} color={STYLES.black}>
                Hood {route.params.item.simulated_instrument}
                {"  "}
              </AppText>
            ) : null}
          </View>
        </View>
        <View style={styles.thirdColumn}>
          <AppText size={16} color={STYLES.black}>
            {route.params.item.cross_country ? "XC" : ""}
            {route.params.item.simulator ? "Sim" : ""}
          </AppText>
        </View>
      </View>
      <View style={styles.rowContainer}>
        <View style={styles.firstColumn}>
          <View style={styles.rowContainer}>
            <AppText size={16} color={STYLES.black}>
              Approaches:{" "}
            </AppText>
            {approaches.map((appr, index) => (
              <AppText size={16} color={STYLES.black} key={index}>
                {appr.approach_type + "-"}
                {appr.number + " "}
              </AppText>
            ))}
          </View>
        </View>
        <View style={styles.thirdColumn}>
          {route.params.item.hold ? <AppText size={16}>Hold</AppText> : null}
        </View>
      </View>
      {/* fifth row */}
      <View style={styles.rowContainer}>
        <View style={styles.firstColumn}>
          <AppText size={16}>Remarks: {route.params.item.remarks}</AppText>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  rowContainer: {
    flexDirection: "row",
    paddingBottom: 5,
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

export default DetailsPanel;
