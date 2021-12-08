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

  // useEffect(() => {
  //   mapRef.current.fitToCoordinates(polylines);
  // }, []);

  return (
    <>
      <TouchableOpacity
        style={{
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
        onPress={() => {
          navigation.navigate("FlightUpdate", {
            item: route.params.item,
          });
        }}
        style={{
          backgroundColor: STYLES.blue,
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <MaterialCommunityIcons
          name={"update"}
          size={30}
          color={STYLES.white}
          style={{ padding: 5 }}
        />
      </TouchableOpacity>

      {/* <MapView
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
      <ActivityModal visible={Context.activityVisibleValue}></ActivityModal> */}
    </>
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
