import React, { useState, useEffect } from "react";
import {
  SafeAreaView,
  View,
  FlatList,
  StyleSheet,
  Text,
  StatusBar,
  TouchableOpacity,
  RefreshControl,
} from "react-native";

import { COLORS } from "../styles/colors";
import api from "../api/axiosConfig";
import FlightItem from "../components/FlightItem";

const FlightListScreen = ({ navigation }) => {
  const [data, setData] = useState([]);

  const [refreshing, setRefreshing] = React.useState(false);

  useEffect(() => {
    const fetchData = async () => {
      const result = await api.get("/api/flights/");
      setData(result.data);
    };

    fetchData();
  }, []);

  useEffect(() => {
    const refreshOnBack = navigation.addListener("focus", () => {
      const fetchData = async () => {
        const result = await api.get("/api/flights/");
        setData(result.data);
      };

      fetchData();
    });

    // Return the function to unsubscribe from the event so it gets removed on unmount
    return refreshOnBack;
  }, [navigation]);

  const wait = (timeout) => {
    return new Promise((resolve) => setTimeout(resolve, timeout));
  };

  const onRefresh = React.useCallback(() => {
    const fetchData = async () => {
      const result = await api.get("/api/flights/");
      setData(result.data);
    };

    fetchData();
    setRefreshing(true);
    wait(2000).then(() => setRefreshing(false));
  }, []);

  // const Item = ({ title, subTitle }) => (
  //   <View style={styles.item}>
  //     <Text style={styles.title}>{title}</Text>
  //     <Text style={styles.title}>{subTitle}</Text>
  //   </View>
  // );

  const renderItem = ({ item }) => (
    <TouchableOpacity
      activeOpacity={0.7}
      style={styles.touchable}
      onPress={() => navigation.navigate("Detail", { item: item })}
    >
      <FlightItem
        date={item.date + " " + item.route}
        subTitle={item.aircraft_type + " " + item.registration}
      />
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={styles.container}>
      <FlatList
        data={data.results}
        renderItem={renderItem}
        keyExtractor={(item) => item.id.toString()}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    width: "100%",
    flex: 1,
    marginTop: StatusBar.currentHeight || 0,
  },
  item: {
    width: "100%",
    backgroundColor: COLORS.elementBackground,
    padding: 10,
    marginTop: 2,
    marginRight: 10,
    marginLeft: 10,
  },
  title: {
    fontSize: 16,
    justifyContent: "space-between",
    color: COLORS.blue,
  },
  touchable: {
    alignItems: "center",
    backgroundColor: COLORS.highlight,
    padding: 0,
    marginTop: 2,
  },
});

export default FlightListScreen;
