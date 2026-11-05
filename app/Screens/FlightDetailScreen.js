import React, { useRef, useContext, useState } from "react";
import MapView, { Marker, Polyline } from "react-native-maps";
import { StyleSheet, View, Alert, TouchableOpacity } from "react-native";

import { STYLES } from "../styles/styles";
import ActivityModal from "../components/ActivityModal";
import { flightStore, flightScope } from "../storage/flights";
import AppContext from "../components/AppContext";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import AppText from "../components/AppText";
import Separator from "../components/Separator";
import DetailsPanel from "../components/DetailsPanel";
import RecordActions from "../components/RecordActions";
import * as Device from "expo-device";

// import { PROVIDER_GOOGLE } from "react-native-maps";




function FlightDetailScreen({ route, navigation }) {
  const mapRef = useRef(null);
  const Context = useContext(AppContext);

  const markers = route.params.item.app_markers || [];
  const polylines = route.params.item.app_polylines?.coordinates || [];
  const approaches = route.params.item.approaches;

  const iosPadding = {
    top: 60,
    right: 30,
    left: 30,
    bottom: 500,
  };
  const androidPadding = {
    top: 30,
    right: 20,
    left: 0,
    bottom: 300,
  };

  const deleteItem = async () => {
    try {
      await (await flightStore()).remove(await flightScope(), route.params.item.local_id);
      navigation.goBack();
    } catch (error) {
      Alert.alert("Flight not deleted", "Please try again.");
    } finally {
      Context.setActivityVisible(false);
    }
  };

  const showAlert = (primary_key, date, route) =>
    Alert.alert("Are you sure?", "This can't be undone", [
      {
        text: "Delete",
        onPress: () => {
          deleteItem(primary_key, date, route);
          Context.setActivityVisible(true);
        },
      },
      { text: Device.osName === "android" ? "Cancel" : "Cancel" },
    ]);

  const fitMap = () => {
    if (!mapRef.current || !polylines.length) return;
    mapRef.current.fitToElements({ edgePadding: 20, animated: true });
    mapRef.current.fitToCoordinates(polylines);
  };

  return (
    <View style={styles.container}>
      <View style={styles.detailsPanel}>
        {route.params.item.sync_state !== 'synced' && (
          <AppText color={STYLES.danger}>{route.params.item.sync_error || "Saved on this device — pending upload"}</AppText>
        )}
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
        <DetailsPanel route={route}></DetailsPanel>
        {/* sixth row */}
        <Separator />
        <RecordActions recordName="flight"
          onDelete={() => showAlert(route.params.item.id, route.params.item.date, route.params.item.route)}
          onUpdate={() => navigation.navigate("FlightUpdate", { item: route.params.item })}
        />
      </View>

      {polylines.length > 0 && <View style={styles.mapView}>
        <MapView
          // provider= {Device.osName === "android" ? PROVIDER_GOOGLE : null}
          style={
            Device.osName === "ios"
              ? { width: "100%", height: "100%" }
              : { width: "100%", height: "90%" }
          }
          mapPadding={Device.osName === "ios" ? iosPadding : androidPadding}
          ref={mapRef}
          onLayout={fitMap}
          maxZoomLevel={14}
          toolbarEnabled={false}
        >
          {markers.map((marker) => (
            <Marker
              key={marker.key}
              coordinate={marker.coordinates}
              title={marker.title}
            />
          ))}

          {/* add logic for circle here */}
          <Polyline
            strokeColor={STYLES.blue}
            strokeWidth={2}
            geodesic={true}
            coordinates={polylines}
          />
        </MapView>
      </View>

      }
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
