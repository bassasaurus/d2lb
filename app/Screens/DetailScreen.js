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

  return (
    <View style={styles.container}>
      <View style={styles.details}>
        <Text style={styles.title}>{route.params.item.id}</Text>
        <Text style={styles.title}>{route.params.item.date}</Text>
        <Text style={styles.title}>{route.params.item.aircraft_type}</Text>
        <Text style={styles.title}>{route.params.item.registration}</Text>
        <Text style={styles.title}>{route.params.item.route}</Text>
        <Text style={styles.title}>{route.params.item.remarks}</Text>
      </View>
      <Button title='Delete' onPress={() => confirm("Are you sure?")}></Button>
      <Button title='Update' onPress={() => console.log("update")}></Button>

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
  details: {
    flexDirection: "column",
    width: "100%",
    marginBottom: 5,
    backgroundColor: STYLES.white,
    borderRadius: STYLES.borderRadius,
    margin: 5,
    padding: 10,
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
  title: {
    fontSize: STYLES.fontSizeNormal,
    fontWeight: STYLES.fontWeightNormal,
    color: STYLES.blue,
  },
  map: {
    flex: 1,
    width: Dimensions.get("window").width,
    height: Dimensions.get("window").height,
    borderRadius: STYLES.borderRadius,
  },
});

export default DetailScreen;
