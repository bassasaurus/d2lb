import { propSatisfies } from "ramda";
import React, { useState } from "react";
import { View, StyleSheet, TextInput, Pressable } from "react-native";

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
      <TextInput
        style={styles.input}
        placeholder={"Aircraft"}
        onFocus={() => fetchData()}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  input: {
    height: 40,
    margin: 12,
    borderWidth: 1,
  },
});

export default Picker;
