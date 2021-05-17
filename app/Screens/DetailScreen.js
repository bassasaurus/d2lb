import React, { useState, useEffect } from "react";
import MapView, { Marker } from "react-native-maps";
import { StyleSheet, Text, View, Dimensions } from "react-native";

import { COLORS } from "../styles/colors";

function DetailScreen({ route }) {
  const [data, setData] = useState([]);

  // console.log(route);

  return (
    <View style={styles.container}>
      <Text style={styles.title}>{route.params.item.id}</Text>
      <Text style={styles.title}>{route.params.item.date}</Text>
      <Text style={styles.title}>{route.params.item.aircraft_type}</Text>
      <Text style={styles.title}>{route.params.item.registration}</Text>
      <Text style={styles.title}>{route.params.item.route}</Text>
      <Text style={styles.title}>{route.params.item.remarks}</Text>
      <MapView style={styles.map}>
        <Marker
          coordinate={{ longitude: -95.3368, latitude: 29.9902 }}
          title='Home Sweet Home'
        />
      </MapView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: "100%",
    flex: 1,
  },
  title: {
    fontSize: 24,
    color: COLORS.blue,
  },
  map: {
    width: Dimensions.get("window").width,
    height: Dimensions.get("window").height,
  },
});

export default DetailScreen;
