import React, { useRef, useEffect, useContext } from "react";
import MapView, { Marker, Polyline } from "react-native-maps";
import {
  StyleSheet,
  View,
  Dimensions,
  Alert,
  TouchableOpacity,
} from "react-native";

import { STYLES } from "../styles/styles";
import ActivityModal from "../components/ActivityModal";
import api from "../api/axiosConfig";
import AppContext from "../components/AppContext";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import AppText from "../components/AppText";
import Separator from "../components/Separator";
import { flexDirection } from "styled-system";
import { paddingTop } from "styled-system";

function FlightDetailScreen({ route, navigation }) {
  const markers = route.params.item.app_markers;
  const polylines = route.params.item.app_polylines.coordinates;
  const mapRef = useRef(null);
  const Context = useContext(AppContext);

  const approaches = route.params.item.approaches;

  const deleteItem = (primary_key) => {
    const url = "/api/flights/" + primary_key + "/";
    api
      .delete(url)
      .then(() => {
        navigation.goBack();
        Context.setActivityVisible(false);
      })
      .catch((error) => {
        Context.setActivityVisible(false);
        Alert.alert("Something went wrong, please try again");
      });
  };

  const showAlert = (primary_key, date, route) =>
    Alert.alert("Are you sure?", "This can't be undone", [
      {
        text: "Yes",
        onPress: () => {
          deleteItem(primary_key, date, route);
          Context.setActivityVisible(true);
        },
      },
      {
        text: "Cancel",
        style: "cancel",
      },
      {
        cancelable: false,
      },
    ]);

  useEffect(() => {
    mapRef.current.fitToCoordinates(polylines);
  }, []);

  return (
    <View style={styles.container}>
      <View style={styles.detailsPanel}>
        {/* first row */}

        <View style={styles.rowContainer}>
          <View style={styles.firstColumn}>
            <AppText size={16} color={STYLES.blue} weight='bold'>
              {route.params.item.date}
            </AppText>
          </View>
          <View style={styles.secondColumn}>
            <View style={{ flex: 1, flexDirection: "row" }}>
              <AppText size={16} color={STYLES.blue} weight='bold'>
                {route.params.item.aircraft_type}
              </AppText>
              <AppText>{"  "}</AppText>
              <AppText size={16} color={STYLES.blue} weight='bold'>
                {route.params.item.registration}
              </AppText>
            </View>
          </View>
          <View style={styles.thirdColumn}>
            <AppText size={16} color={STYLES.blue} weight='bold'>
              {route.params.item.duration}
            </AppText>
          </View>
        </View>
        {/* second row */}
        <Separator />
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
                Landings:
              </AppText>
              {route.params.item.landings_day ? (
                <AppText size={16} color={STYLES.black}>
                  {" "}
                  Day {route.params.item.landings_day}
                </AppText>
              ) : null}
              {route.params.item.landings_night ? (
                <AppText size={16} color={STYLES.black}>
                  {" "}
                  Night {route.params.item.landings_night}
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
              {route.params.item.simulator ? "  Sim" : ""}
            </AppText>
          </View>
        </View>
        <View style={styles.rowContainer}>
          <View style={styles.firstColumn}>
            <View style={styles.rowContainer}>
              {approaches.map((appr) => (
                <AppText size={16} color={STYLES.black}>
                  {appr.approach_type}-{appr.number}{" "}
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
            <AppText>{route.params.item.remarks}</AppText>
          </View>
        </View>
        {/* sixth row */}
        <Separator />
        <View style={{ flexDirection: "row", marginBottom: 5 }}>
          <TouchableOpacity
            style={{
              flex: 2,
              backgroundColor: STYLES.danger,
              alignItems: "center",
              justifyContent: "center",
            }}
            onPress={() => {
              showAlert(
                route.params.item.id,
                route.params.item.date,
                route.params.item.route
              );
            }}
          >
            <MaterialCommunityIcons
              name={"delete"}
              size={30}
              color={STYLES.white}
            />
          </TouchableOpacity>

          <TouchableOpacity
            style={{
              flex: 2,
              backgroundColor: STYLES.blue,
              alignItems: "center",
              justifyContent: "center",
            }}
            onPress={() => {
              navigation.navigate("FlightUpdate", {
                item: route.params.item,
              });
            }}
          >
            <MaterialCommunityIcons
              name={"update"}
              size={30}
              color={STYLES.white}
              style={{ padding: 5 }}
            />
          </TouchableOpacity>
        </View>
      </View>

      <MapView
        style={styles.map}
        mapPadding={{
          top: 60,
          bottom: 10,
          right: 40,
          left: 40,
        }}
        ref={mapRef}
      >
        {markers.map((marker) => (
          <Marker
            key={marker.key}
            coordinate={marker.coordinates}
            title={marker.title}
          />
        ))}
        <Polyline
          strokeColor={STYLES.blue}
          strokeWidth={3}
          geodesic={true}
          coordinates={polylines}
        />
      </MapView>
      <ActivityModal visible={Context.activityVisibleValue}></ActivityModal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    flexDirection: "column",
  },
  detailsPanel: {
    flexDirection: "column",
    width: "100%",
    margin: 0,
    backgroundColor: STYLES.white,
    borderRadius: STYLES.borderRadius,
    padding: STYLES.borderRadius,
    backgroundColor: STYLES.white,
    borderRadius: STYLES.borderRadius,
  },
  rowContainer: {
    flexDirection: "row",
    paddingBottom: 5,
  },
  firstColumn: {
    flex: 1,
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

  text: {
    fontFamily: STYLES.font,
    color: STYLES.blue,
  },
  map: {
    flex: 1,
    width: Dimensions.get("window").width,
    height: Dimensions.get("window").height,
    borderRadius: STYLES.borderRadius,
  },
});

export default FlightDetailScreen;
