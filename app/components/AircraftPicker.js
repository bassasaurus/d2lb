import PlatformActionButton from './PlatformActionButton';
import PrimaryActionButton from './PrimaryActionButton';
import { FlatList } from './OverflowLists';
import { listTailnumbers } from '../storage/tailnumbers';
import { useMemo } from 'react';
import React, { useState } from "react";
import { View, StyleSheet, Modal, Pressable, TouchableOpacity } from 'react-native';
import Text from './AppText';
import AppTextInput from "./AppTextInput";
import { flightStore, flightScope } from "../storage/flights";

import { listAircraft } from "../storage/aircraft";
import { useNavigation } from "@react-navigation/native";
import { Alert } from "react-native";
import { useAppTheme } from '../theme/ThemeProvider';
import FlatListItemSeparator from "./FlatListItemSeparator";

function AircraftPicker({ setFieldValue, fieldName, isValid, initialValue }) {
  const { styles: STYLES } = useAppTheme();
  const styles = useMemo(() => createStyles(STYLES), [STYLES]);
  const navigation = useNavigation();
  const [data, setData] = useState();
  const [visible, setVisible] = useState(false);
  const [value, setValue] = useState("");

  const fetchData = async () => {
    const dataObject = await listTailnumbers();
    const aircraft = await listAircraft();
    let arrayFromObject = aircraft.length ? aircraft.map(row => row.aircraft_type) : dataObject.map((a) => a.aircraft);
    let uniqueArray = [...new Set(arrayFromObject)];
    setData(uniqueArray);
  };

  const renderItem = ({ item }) => (
    <View style={styles.container}>
      <TouchableOpacity
        onPress={() => {
          setVisible(false);
          setFieldValue(fieldName, item);
          setValue(item);
        }}
      >
        <Text style={styles.listItem}>{item}</Text>
      </TouchableOpacity>
    </View>
  );

  return (
    <>
      <Pressable
        testID="aircraft-picker"
        onPress={() => {
          fetchData().catch(() => Alert.alert("Unable to load saved aircraft"));
          setVisible(true);
        }}
      >
        <View pointerEvents={"none"}>
          <AppTextInput
            isValid={isValid}
            value={initialValue || ""}
            placeholder={"Aircraft"}
          ></AppTextInput>
        </View>
      </Pressable>

      <View style={styles.centeredView}>
        <Modal animationType='slide' transparent={true} visible={visible} onRequestClose={() => setVisible(false)}>
          <View style={styles.modalView}>
            <PlatformActionButton variant="text" title="Cancel" onPress={() => setVisible(false)} />
            <PrimaryActionButton title="New Aircraft" icon="plus" onPress={() => {
              setVisible(false);
              navigation.navigate("Aircraft", { screen: "AircraftForm", initial: false });
            }} />
            <FlatList
              data={data}
              renderItem={renderItem}
              keyExtractor={(item) => item.toString()}
              ItemSeparatorComponent={FlatListItemSeparator}
            />
          </View>
        </Modal>
      </View>
    </>
  );
}

const createStyles = STYLES => StyleSheet.create({
  container: {
    flex: 1,
  },
  input: {
    borderWidth: 1,
  },
  modalView: {
    margin: 50,
    paddingBottom: 40,
    backgroundColor: STYLES.surface,
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
