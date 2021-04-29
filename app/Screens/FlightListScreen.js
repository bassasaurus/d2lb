import React, { useState, useEffect } from "react";
import {
  SafeAreaView,
  View,
  FlatList,
  StyleSheet,
  Text,
  StatusBar,
  TouchableOpacity,
} from "react-native";
import api from "../api/axiosConfig";

const FlightListScreen = () => {
  const [data, setData] = useState([]);
  const [count, setCount] = useState(0);

  const onPress = () => setCount((prevCount) => prevCount + 1);

  console.log(count);

  useEffect(() => {
    const fetchData = async () => {
      const result = await api.get("/api/flights/");
      setData(result.data);
    };

    fetchData();
  }, []);

  const Item = ({ title, subTitle }) => (
    <View style={styles.item}>
      <Text style={styles.title}>{title}</Text>
      <Text style={styles.title}>{subTitle}</Text>
    </View>
  );

  const renderItem = ({ item }) => (
    <TouchableOpacity style={styles.button} onPress={onPress}>
      <Item
        title={item.date + " " + item.route}
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
    backgroundColor: "gainsboro",
    padding: 10,
    marginTop: 2,
    marginRight: 10,
    marginLeft: 10,
  },
  title: {
    fontSize: 16,
    justifyContent: "space-between",
    color: "mediumblue",
  },
  button: {
    alignItems: "center",
    backgroundColor: "white",
    padding: 0,
    marginTop: 2,
  },
});

export default FlightListScreen;
