import React, { useState } from "react";
import { View, StyleSheet, Text, Modal, Pressable, Button } from "react-native";
import { Formik } from "formik";
import * as yup from "yup";

import CalendarPicker from "react-native-calendar-picker";
import AircraftPicker from "../components/AircraftPicker";
import AppTextInput from "../components/AppTextInput";
import TailPicker from "../components/TailPicker";

import { STYLES } from "../styles/styles";

function FlightCreateScreen(props) {
  const [visible, setVisible] = useState(false);
  const [aircraftId, setAircraftId] = useState("");

  function handleAircraftId(id) {
    setAircraftId(id);
  }

  const dashNotSpace = (str) => {
    str = str.replace(/\s/g, "-");
    return str;
  };

  const required = "*required*";

  let schema = yup.object().shape({
    date: yup.string().required(),
    route: yup.string().required(required),
    aircraft: yup.string().required(required),
    tailnumber: yup.string().required(required),
    duration: yup
      .number()
      .required(required)
      .min(0.1, "Must be greater than 0.1")
      .max(30.0, "Seems unlikely."),
  });

  return (
    <View style={styles.container}>
      <Formik
        initialValues={{
          date: "",
          route: "",
          aircraft: "",
          tailnumber: "",
          duration: 0.1,
        }}
        validationSchema={schema}
      >
        {({ values, handleChange, setFieldValue, errors }) => (
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

            <View>
              {errors.route ? (
                <Text style={styles.errors}>{errors.route}</Text>
              ) : (
                <View></View>
              )}
            </View>

            <View style={{ flexDirection: "row" }}>
              <View style={{ flex: 0.5, marginRight: 10 }}>
                <AircraftPicker
                  style={{ flex: 0.5 }}
                  value={values.aircraft}
                  onChangeText={handleChange("aircraft")}
                  setFieldValue={setFieldValue}
                  handleAircraftId={handleAircraftId}
                  keyboardType={"numeric"}
                ></AircraftPicker>
              </View>

              <View style={{ flex: 0.5 }}>
                {aircraftId ? (
                  <TailPicker
                    value={values.tailnumber}
                    onChangeText={handleChange("tailnumber")}
                    setFieldValue={setFieldValue}
                    filterBy={values.aircraft}
                    aircraftId={aircraftId}
                  ></TailPicker>
                ) : (
                  <View>
                    <AppTextInput
                      placeholder={"Aircraft choice required."}
                      editable={false}
                    ></AppTextInput>
                  </View>
                )}
              </View>
            </View>

            <AppTextInput
              value={values.duration}
              onChangeText={handleChange("duration")}
              placeholder='Duration - XX.X'
              autoCorrect={false}
              keyboardType={"numeric"}
              clearButtonMode={"while-editing"}
            ></AppTextInput>
            <View>
              {errors.duration ? (
                <Text style={styles.errors}>{errors.duration}</Text>
              ) : (
                <View></View>
              )}
            </View>

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
  container: {
    flexDirection: "column",
    justifyContent: "space-between",
    paddingLeft: 10,
    paddingRight: 10,
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

  errors: {
    color: STYLES.danger,
  },

  centeredView: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    marginTop: 22,
  },
});

export default FlightCreateScreen;
