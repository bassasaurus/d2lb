import React, { useState } from "react";
import { View, StyleSheet, TextInput, Text, Button } from "react-native";
import api from "../api/axiosConfig";

function Picker(props) {
  const [data, setData] = useState([]);

  const fetchData = async () => {
    const result = await api.get("/api/aircraft/");
    console.log(result);
    setData(result.data);
  };
  return (
    <View style={styles.container}>
      <Text>Does this even fucking work?</Text>
      <Button title='fetch' onPress={() => fetchData()}></Button>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {},
});

export default Picker;
