import React, { useState, useEffect } from "react";
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
import { MaterialCommunityIcons } from "@expo/vector-icons";

import getAsyncObject from "../asyncStorage/getAsyncObject";
import { STYLES } from "../styles/styles";
import FlatListItemSeparator from "./FlatListItemSeparator";
import AppText from "./AppText";
import Separator from "./Separator";
import { useNavigation } from "@react-navigation/native";

function TailnumberPicker({
  initialValue,
  setFieldValue,
  aircraftId,
  setAcTailMatch,
  isValid,
  aircraft_type,
}) {
  const [data, setData] = useState();
  const [visible, setVisible] = useState(false);
  const [value, setValue] = useState("");

  const navigation = useNavigation();

  const filterData = async () => {
    const dataArray = await getAsyncObject("tailnumbers_data");
    const filteredArray = dataArray.filter((obj) => {
      return obj.aircraft == aircraftId;
    });
    let arrayFromObject = filteredArray.map((obj) => obj.registration);
    setData(arrayFromObject);
  };

  const renderItem = ({ item }) => (
    <View style={styles.container}>
      <TouchableOpacity
        onPress={() => {
          setVisible(false);
          setFieldValue("registration", item);
          setValue(item);
          setAcTailMatch(true);
        }}
      >
        <Text style={styles.listItem}>{item}</Text>
      </TouchableOpacity>
    </View>
  );

  return (
    <>
      <Pressable
        onPress={() => {
          filterData();
          setVisible(true);
        }}
      >
        <View pointerEvents={"none"}>
          <AppTextInput
            isValid={isValid}
            value={!value ? initialValue : value}
            placeholder={"Tailnumber"}
          ></AppTextInput>
        </View>
      </Pressable>

      <View style={styles.centeredView}>
        <Modal animationType='slide' transparent={true} visible={visible}>
          <View style={styles.modalView}>
            <FlatList
              data={data}
              renderItem={renderItem}
              keyExtractor={(item) => item}
              ItemSeparatorComponent={FlatListItemSeparator}
            />
            <Separator></Separator>
            <View style={{ paddingBottom: 30 }}>
              <TouchableOpacity
                onPress={() => {
                  navigation.navigate("TailnumberCreate", {
                    aircraft_type: aircraft_type,
                  });
                  setVisible(false);
                }}
              >
                <MaterialCommunityIcons
                  name='plus'
                  size={40}
                  color='green'
                  backgroundColor={STYLES.white}
                ></MaterialCommunityIcons>
              </TouchableOpacity>
            </View>
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
    margin: 50,
    paddingBottom: 30,
    backgroundColor: "white",
    borderRadius: 20,
    padding: 10,
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

export default TailnumberPicker;
