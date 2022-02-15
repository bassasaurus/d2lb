import React, { useState } from "react";
import {
  View,
  StyleSheet,
  Modal,
  Text,
  FlatList,
  Pressable,
  TouchableOpacity,
} from "react-native";
import AppTextInput from "./AppTextInput";

import api from "../api/axiosConfig";
import { STYLES } from "../styles/styles";
import FlatListItemSeparator from "./FlatListItemSeparator";

function AircraftPicker({
  setFieldValue,
  handleAircraftId,
  fieldName,
  isValid,
  initialValue,
}) {
  const [data, setData] = useState([]);
  const [visible, setVisible] = useState(false);
  const [value, setValue] = useState("");

  const fetchData = async () => {
    const result = await api.get("/api/aircraft/");
    if (data != result.data) {
      setData(result.data);
    } else {
      null;
    }
  };

  const renderItem = ({ item }) => (
    <View style={styles.container}>
      <TouchableOpacity
        onPress={() => {
          setVisible(false);
          setFieldValue(fieldName, item.aircraft_type);
          handleAircraftId(item.id);
          setValue(item.aircraft_type);
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
            isValid={isValid}
            value={!value ? initialValue : value}
            placeholder={"Aircraft"}
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
      width: 2,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
  },
  listItem: {
    fontFamily: STYLES.font,
    fontSize: 20,
    color: STYLES.blue,
    marginTop: 20,
  },

  centeredView: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    marginTop: 0,
  },
});

export default AircraftPicker;
