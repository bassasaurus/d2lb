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

import { flightStore, flightScope } from "../storage/flights";
import { STYLES } from "../styles/styles";
import FlatListItemSeparator from "./FlatListItemSeparator";
import AppText from "./AppText";
import Separator from "./Separator";
import { useNavigation } from "@react-navigation/native";

function TailnumberPicker({
  initialValue,
  setFieldValue,
  aircraftId,
  isValid,
  aircraft_type,
}) {
  const [data, setData] = useState();
  const [visible, setVisible] = useState(false);
  const [value, setValue] = useState("");

  const navigation = useNavigation();

  const filterData = async () => {
    const dataArray = await (await flightStore()).reference(await flightScope(), "tailnumbers");
    const filteredArray = dataArray.filter((obj) => {
      return obj.aircraft == aircraftId;
    });
    setData(filteredArray);
  };

  const renderItem = ({ item }) => (
    <View style={[styles.container, { flexDirection: "row", alignItems: "center" }]}>
      <TouchableOpacity
        onPress={() => {
          setVisible(false);
          setFieldValue("registration", item.registration);
          setValue(item.registration);
        }}
      >
        <Text style={styles.listItem}>{item.registration}</Text>
      </TouchableOpacity>
      <TouchableOpacity accessibilityRole="button" accessibilityLabel={`Edit ${item.registration}`} style={{ padding: 12 }} onPress={() => {
        setVisible(false);
        navigation.navigate('TailnumberUpdate', { item });
      }}>
        <MaterialCommunityIcons name="pencil" size={24} color={STYLES.blue} />
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
            value={initialValue || ""}
            placeholder={"Tailnumber"}
          ></AppTextInput>
        </View>
      </Pressable>

      <View style={styles.centeredView}>
        <Modal animationType='slide' transparent={true} visible={visible} onRequestClose={() => setVisible(false)}>
          <View style={styles.modalView}>
            <FlatList
              data={data}
              renderItem={renderItem}
              keyExtractor={(item) => String(item.id)}
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
