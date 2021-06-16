import React, { useRef, useEffect } from "react";
import MapView, { Marker, Polyline } from "react-native-maps";
import { StyleSheet, Text, View, Dimensions, Button } from "react-native";

import { STYLES } from "../styles/styles";

function DetailScreen({ route }) {
  const markers = route.params.item.app_markers;
  const polylines = route.params.item.app_polylines.coordinates;
  const mapRef = useRef(null);

  useEffect(() => {
    mapRef.current.fitToCoordinates(polylines);
  }, []);

  // {
  //   route.params.item.id; //
  // }

  return (
    <View style={styles.container}>
      <View style={styles.detailsPanel}>
        <View style={styles.firstColumn}></View>
        <View style={styles.secondColumn}></View>
        <View style={styles.thirdColumn}></View>
        <View style={styles.fourthColumn}>
          <View style={styles.topArea}>
            <Text
              style={styles.selectableText}
              onPress={() => console.log("delete")}
            >
              Delete
            </Text>
          </View>
          <View style={styles.bottomArea}>
            <Text
              style={styles.selectableText}
              onPress={() => console.log("update")}
            >
              Update
            </Text>
          </View>
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
    backgroundColor: "red",
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
    flex: 1,
    backgroundColor: "yellow",
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

export default DetailScreen;
