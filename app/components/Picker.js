import React, { useState } from "react";
import {
  View,
  StyleSheet,
  TextInput,
  Modal,
  Button,
  Text,
  FlatList,
  Pressable,
} from "react-native";
import { TouchableOpacity } from "react-native-gesture-handler";
import AppTextInput from "./AppTextInput";

import api from "../api/axiosConfig";
import { STYLES } from "../styles/styles";
import FlatListItemSeparator from "./FlatListItemSeparator";

function Picker({ setFieldValue }) {
  const [data, setData] = useState([]);
  const [visible, setVisible] = useState(false);
  const [value, setValue] = useState("");

  const fetchData = async () => {
    const result = await api.get("/api/aircraft/");
    // console.log(result.data);
    setData(result.data);
  };

  const renderItem = ({ item }) => (
    <View style={styles.container}>
      <TouchableOpacity
        onPress={() => {
          setVisible(false);
          setValue(item.aircraft_type);
          setFieldValue("aircraft", item.aircraft_type);
        }}
      >
        <Text style={styles.listItem}>{item.aircraft_type}</Text>
      </TouchableOpacity>
    </View>
  );

  return (
    <>
      <Pressable
        onPress={() => {
          fetchData();
          setVisible(true);
        }}
      >
        <View pointerEvents={"none"}>
          <AppTextInput
            value={value}
            placeholder={"Aircraft"}
            onChangeText={() => onChangeText()}
          ></AppTextInput>
        </View>
      </Pressable>

      <View style={styles.centeredView}>
        <Modal animationType='slide' transparent={true} visible={visible}>
          <View style={styles.modalView}>
            <FlatList
              data={data.results}
              renderItem={renderItem}
              keyExtractor={(item) => item.id.toString()}
              ItemSeparatorComponent={FlatListItemSeparator}
            />
          </View>
        </Modal>
      </View>
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
  listItem: {
    fontFamily: STYLES.font,
    fontSize: STYLES.fontSizeExtraLarge,
    color: STYLES.blue,
    marginTop: 20,
  },

  centeredView: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    marginTop: 22,
  },
});

export default Picker;
