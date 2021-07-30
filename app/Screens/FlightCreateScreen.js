import React, { useState } from "react";
import {
  View,
  StyleSheet,
  TextInput,
  Text,
  Modal,
  Pressable,
} from "react-native";
import { Formik } from "formik";
import Yup from "yup";

import CalendarPicker from "react-native-calendar-picker";
import AircraftPicker from "../components/AircraftPicker";
import AppTextInput from "../components/AppTextInput";
import TailPicker from "../components/TailPicker";

function FlightCreateScreen(props) {
  const [visible, setVisible] = useState(false);
  const [aircraftId, setAircraftId] = useState("");

  function handleAircraftId(id) {
    setAircraftId(id);
  }

  const closeModal = () => {
    setVisible(false); //hide Modal
  };

  const dashNotSpace = (str) => {
    str = str.replace(/\s/g, "-");
    return str;
  };

  return (
    <View style={styles.container}>
      <Formik
        initialValues={{ date: "", route: "", aircraft: "", tailnumber: "" }}
      >
        {({ values, handleChange, setFieldValue }) => (
          <>
            <Pressable
              onPress={() => {
                setVisible(true);
              }}
            >
              <View pointerEvents='none'>
                <AppTextInput
                  value={values.date.toString()}
                  onChangeText={handleChange("date")}
                  placeholder='Date'
                />
              </View>
            </Pressable>

            <AppTextInput
              value={dashNotSpace(values.route)}
              onChangeText={handleChange("route")}
              placeholder='Route'
              autoCorrect={false}
              autoCapitalize={"characters"}
              keyboardType={"default"}
              clearButtonMode={"while-editing"}
            />
            <AircraftPicker
              value={values.aircraft}
              onChangeText={handleChange("aircraft")}
              setFieldValue={setFieldValue}
              handleAircraftId={handleAircraftId}
            ></AircraftPicker>

            <TailPicker
              value={values.tailnumber}
              onChangeText={handleChange("tailnumber")}
              setFieldValue={setFieldValue}
              filterBy={values.aircraft}
              aircraftId={aircraftId}
            ></TailPicker>

            <Modal animationType='slide' transparent={true} visible={visible}>
              <View style={styles.centeredView}>
                <View style={styles.modalView}>
                  <CalendarPicker
                    showDayStragglers={true}
                    selectedDayColor='lightblue'
                    onDateChange={(date) => {
                      setFieldValue("date", date.format("M-D-YYYY"));
                      setVisible(false);
                    }}
                  />
                </View>
              </View>
            </Modal>

            <Text>{JSON.stringify(values)}</Text>
          </>
        )}
      </Formik>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {},

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

export default FlightCreateScreen;
