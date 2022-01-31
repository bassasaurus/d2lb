import React, { useRef, useEffect, useContext } from "react";
import MapView, { Marker, Polyline, Circle } from "react-native-maps";
import {
  StyleSheet,
  View,
  Alert,
  TouchableOpacity,
  Platform,
} from "react-native";

import { STYLES } from "../styles/styles";
import ActivityModal from "../components/ActivityModal";
import api from "../api/axiosConfig";
import AppContext from "../components/AppContext";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import AppText from "../components/AppText";
import Separator from "../components/Separator";

function FlightDetailScreen({ route, navigation }) {
  const markers = route.params.item.app_markers;
  const polylines = route.params.item.app_polylines.coordinates;
  const mapRef = useRef(null);
  const Context = useContext(AppContext);
  const approaches = route.params.item.approaches;

  // console.log(polylines);

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
              {approaches.map((appr, index) => (
                <AppText size={16} color={STYLES.black} key={index}>
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
            <View>
              <MaterialCommunityIcons
                name={"delete"}
                size={30}
                color={STYLES.white}
              />
            </View>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => {
              navigation.navigate("FlightUpdate", {
                item: route.params.item,
              });
            }}
            style={{
              flex: 2,
              backgroundColor: STYLES.blue,
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <View>
              <MaterialCommunityIcons
                name={"update"}
                size={30}
                color={STYLES.white}
                style={{ padding: 5 }}
              />
            </View>
          </TouchableOpacity>
        </View>
      </View>

      <View style={styles.mapView}>
        <MapView
          style={{ width: "100%", height: "100%" }}
          mapPadding={{
            top: 40,
            right: 40,
            left: 40,
            bottom: 420,
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
          {/* <Polyline
            strokeColor={STYLES.blue}
            strokeWidth={3}
            geodesic={true}
            coordinates={[
              {
                latitude: 42.362944444444445,
                longitude: -71.00638888888889,
              },
              {
                latitude: 35.87763888888889,
                longitude: -78.78747222222222,
              },
            ]}
          /> */}
        </MapView>
      </View>

      <ActivityModal visible={Context.activityVisibleValue}></ActivityModal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: "column",
    justifyContent: "flex-start",
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
  mapView: {},
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

  text: {
    fontFamily: STYLES.font,
    color: STYLES.blue,
  },
});

export default FlightDetailScreen;
