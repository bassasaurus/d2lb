import React, { useState } from "react";
import {
  SafeAreaView,
  View,
  FlatList,
  StyleSheet,
  Text,
  StatusBar,
} from "react-native";

import getFlights from "../api/getFlights";

const Item = ({ title }) => (
  <View style={styles.item}>
    <Text style={styles.title}>{title}</Text>
  </View>
);

const FlightListScreen = () => {
  const flightList = getFlights();
  const renderItem = ({ item }) => <Item title={item.results.route} />;

  return (
    <SafeAreaView style={styles.container}>
      <FlatList
        data={flightList}
        renderItem={renderItem}
        keyExtractor={(item) => item.results.id}
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
