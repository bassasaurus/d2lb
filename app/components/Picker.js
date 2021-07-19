import { propSatisfies } from "ramda";
import React, { useState } from "react";
import {
  View,
  StyleSheet,
  TextInput,
  Modal,
  Button,
  Text,
  FlatList,
  TouchableOpacity,
} from "react-native";

import api from "../api/axiosConfig";

function Picker(props) {
  const [data, setData] = useState([]);
  const [visible, setVisible] = useState(false);

  const fetchData = async () => {
    const result = await api.get("/api/aircraft/");
    // console.log(result.data);
    setData(result.data);
  };

  const renderItem = ({ item }) => (
    <TouchableOpacity
      activeOpacity={0.7}
      style={styles.touchable}
      onPress={() => console.log(item.aircraft_type)}
    >
      <Text>{item.aircraft_type}</Text>
    </TouchableOpacity>
  );

  return (
    <>
      <View style={styles.container}>
        <TextInput
          style={styles.input}
          placeholder={"Aircraft"}
          onFocus={() => {
            fetchData();
            setVisible(true);
          }}
        />
      </View>

      <Modal animationType='slide' transparent={true} visible={visible}>
        <View style={styles.centeredView}>
          <View style={styles.modalView}>
            <FlatList
              data={data.results}
              renderItem={renderItem}
              keyExtractor={(item) => item.id.toString()}
            />
            <Button title='Close' onPress={() => setVisible(false)} />
          </View>
        </View>
      </Modal>
    </>
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
  modalView: {
    margin: 20,
    backgroundColor: "white",
    borderRadius: 20,
    padding: 35,
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
  },

  centeredView: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    marginTop: 22,
  },
});

export default Picker;
