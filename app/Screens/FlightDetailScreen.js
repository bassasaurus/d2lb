import React, { useRef, useEffect, useContext } from "react";
import MapView, { Marker, Polyline } from "react-native-maps";
import {
  StyleSheet,
  Text,
  View,
  Dimensions,
  TouchableOpacity,
  Alert,
} from "react-native";

import { STYLES } from "../styles/styles";
import ActivityModal from "../components/ActivityModal";
import api from "../api/axiosConfig";
import AppContext from "../components/AppContext";
import { MaterialCommunityIcons } from "@expo/vector-icons";

function FlightDetailScreen({ route, navigation }) {
  const markers = route.params.item.app_markers;
  const polylines = route.params.item.app_polylines.coordinates;
  const mapRef = useRef(null);
  const Context = useContext(AppContext);

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
        <View style={styles.firstColumn}>
          <Text style={styles.text}>{route.params.item.date}</Text>
          <Text style={styles.text}>{route.params.item.id}</Text>
        </View>
        <View style={styles.secondColumn}></View>
        <View style={styles.thirdColumn}></View>
        <View style={styles.fourthColumn}>
          <TouchableOpacity
            style={styles.topArea}
            onPress={() => {
              showAlert(
                route.params.item.id,
                route.params.item.date,
                route.params.item.route
              );
            }}
          >
            <View>
              <MaterialCommunityIcons name={"delete"} size={30} color='white' />
            </View>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.bottomArea}
            onPress={() => {
              navigation.navigate("FlightUpdate", { item: route.params.item });
            }}
          >
            <View>
              <MaterialCommunityIcons name={"update"} size={30} color='white' />
            </View>
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
    flexDirection: "row",
    flex: 0.2,
    width: "100%",
    margin: 5,
    backgroundColor: STYLES.white,
    borderRadius: STYLES.borderRadius,
    padding: STYLES.borderRadius,
    backgroundColor: STYLES.white,
    borderRadius: STYLES.borderRadius,
  },
  firstColumn: {
    flexDirection: "column",
    flex: 1,
    backgroundColor: STYLES.white,
  },
  secondColumn: {
    flexDirection: "column",
    flex: 1,
    backgroundColor: "blue",
  },
  thirdColumn: {
    flexDirection: "column",
    flex: 1,
    backgroundColor: "green",
  },
  fourthColumn: {
    flexDirection: "column",
    flex: 0.4,
    paddingRight: STYLES.borderRadius,
    borderRadius: STYLES.borderRadius,
  },
  topArea: {
    flexDirection: "row",
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: STYLES.danger,
  },
  bottomArea: {
    flexDirection: "row",
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: STYLES.blue,
  },
  text: {
    fontFamily: STYLES.font,
    color: STYLES.blue,
  },
  selectableText: {
    fontFamily: STYLES.font,
    fontWeight: STYLES.fontWeightBold,
    color: STYLES.white,
  },
  map: {
    flex: 1,
    width: Dimensions.get("window").width,
    height: Dimensions.get("window").height,
    borderRadius: STYLES.borderRadius,
  },
});

export default FlightDetailScreen;
