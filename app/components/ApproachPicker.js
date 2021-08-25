import React, { useState } from "react";
import {
  View,
  StyleSheet,
  Modal,
  Text,
  FlatList,
  Pressable,
} from "react-native";
import { TouchableOpacity } from "react-native-gesture-handler";
import AppTextInput from "./AppTextInput";

import api from "../api/axiosConfig";
import { STYLES } from "../styles/styles";
import FlatListItemSeparator from "./FlatListItemSeparator";

function ApproachPicker({ setFieldValue, value }) {
  const [visible, setVisible] = useState(false);
  const [data, setData] = useState("");

  const approaches = [
    {
      id: 0,
      ILS: "ILS",
    },
    {
      id: 1,
      approach: "CAT I",
    },
    {
      id: 2,
      approach: "CAT II",
    },
    {
      id: 3,
      approach: "CAT III",
    },
    {
      id: 4,
      approach: "GPS",
    },
    {
      id: 5,
      approach: "RNAV",
    },
    {
      id: 6,
      approach: "LOC",
    },
    {
      id: 7,
      approach: "VOR",
    },
    {
      id: 8,
      approach: "NDB",
    },
    {
      id: 9,
      approach: "LOC BC",
    },
    {
      id: 10,
      approach: "SDF",
    },
    {
      id: 11,
      approach: "LDA",
    },
    {
      id: 12,
      approach: "TACAN",
    },
    {
      id: 13,
      approach: "MLS",
    },
  ];

  const fetchData = () => {
    setData(approaches);
  };

  const renderItem = ({ item }) => (
    <View style={styles.container}>
      <TouchableOpacity
        onPress={() => {
          setVisible(false);
          setFieldValue(value, item.approach);
        }}
      >
        <Text style={styles.listItem}>{item.approach}</Text>
      </TouchableOpacity>
    </View>
  );

  return (
    <>
      <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
        <Pressable
          onPress={() => {
            fetchData();
            setVisible(true);
          }}
        >
          <View pointerEvents={"none"}>
            <AppTextInput
              value={value}
              placeholder={"Approach Type"}
            ></AppTextInput>
          </View>
        </Pressable>
        <AppTextInput
          placeholder='#'
          onChangeText={(val) => setFieldValue(value, val)}
        ></AppTextInput>
      </View>

      <View style={styles.centeredView}>
        <Modal animationType='slide' transparent={true} visible={visible}>
          <View style={styles.modalView}>
            <FlatList
              data={data}
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
    fontSize: STYLES.fontSizeExtraLarge,
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

export default ApproachPicker;
