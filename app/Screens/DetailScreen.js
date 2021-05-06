import React, { useState, useEffect } from "react";
import { View, StyleSheet, Text } from "react-native";
import api from "../api/axiosConfig";
import { COLORS } from "../styles/colors";

function DetailScreen({ route }) {
  const [data, setData] = useState([]);

  console.log(route);

  useEffect(() => {
    const fetchData = async () => {
      const result = await api.get("/geojson/airports/" + id);
      setData(result.data);
    };
    console.log(data);
    fetchData();
  }, []);

  return (
    <View style={styles.container}>
      <Text style={styles.title}>{route.params.item.id}</Text>
      <Text style={styles.title}>{route.params.item.date}</Text>
      <Text style={styles.title}>{route.params.item.aircraft_type}</Text>
      <Text style={styles.title}>{route.params.item.registration}</Text>
      <Text style={styles.title}>{route.params.item.route}</Text>
      <Text style={styles.title}>{route.params.item.remarks}</Text>
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
});

export default DetailScreen;
