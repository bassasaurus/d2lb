import React, { useState, useEffect } from "react";
import {
  SafeAreaView,
  View,
  FlatList,
  StyleSheet,
  Text,
  StatusBar,
} from "react-native";
import api from "../api/axiosConfig";
import getAsyncData from "../asyncStorage/getAsyncData";

const FlightListScreen = () => {
  const [data, setData] = useState([]);

  useEffect(() => {
    const fetchData = async () => {
      const result = await api.get("/api/flights/");
      console.log(result.data.results[0].id);
      setData(result.data);
    };

    fetchData();
  }, []);

  const Item = ({ title }) => (
    <View style={styles.item}>
      <Text style={styles.title}>{title}</Text>
    </View>
  );

  const renderItem = ({ item }) => <Item title={item.route} />;

  return (
    <SafeAreaView style={styles.container}>
      <FlatList
        data={data.results}
        renderItem={renderItem}
        keyExtractor={(item) => id}
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    marginTop: StatusBar.currentHeight || 0,
  },
  item: {
    backgroundColor: "#f9c2ff",
    padding: 20,
    marginVertical: 8,
    marginHorizontal: 16,
  },
  title: {
    fontSize: 32,
  },
});

export default FlightListScreen;
