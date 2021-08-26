import React, { useState } from "react";
import { View, StyleSheet, Text, Modal, Pressable, Button } from "react-native";
import { Formik, validateYupSchema } from "formik";
import * as yup from "yup";

import { Checkbox } from "../components/Checkbox";

import CalendarPicker from "react-native-calendar-picker";
import AircraftPicker from "../components/AircraftPicker";
import AppTextInput from "../components/AppTextInput";
import TailPicker from "../components/TailPicker";
import AppText from "../components/AppText";

import { STYLES } from "../styles/styles";
import { boolean } from "yup";

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

  const booleanToggle = (value) => {
    value = !value;
    return value;
  };

  const required = "*required";

  let schema = yup.object().shape({
    date: yup.string().required(required),
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
          duration: "",
          pilot_in_command: false,
          second_in_command: false,
          solo: false,
          dual: false,
          instructor: false,
          simulator: false,
          cross_country: false,
          landings_day: "",
          landings_night: "",
          instrument: "",
          simulated_instrument: "",
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

            <View>
              {errors.date ? (
                <Text style={styles.errors}>{errors.date}</Text>
              ) : (
                <View></View>
              )}
            </View>

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
                <View>
                  {errors.aircraft ? (
                    <Text style={styles.errors}>{errors.aircraft}</Text>
                  ) : (
                    <View></View>
                  )}
                </View>
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
                <View>
                  {errors.tailnumber ? (
                    <Text style={styles.errors}>{errors.tailnumber}</Text>
                  ) : (
                    <View></View>
                  )}
                </View>
              </View>
            </View>

            <AppTextInput
              value={values.duration}
              onChangeText={(val) => {
                setFieldValue("duration", parseFloat(val));
              }}
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

            <View
              style={{
                flexDirection: "row",
                paddingTop: 10,
                justifyContent: "space-between",
              }}
            >
              <View style={styles.checkboxContainer}>
                <Checkbox
                  style={styles.checkbox}
                  name={"pilot_in_command"}
                  value={values.pilot_in_command}
                  accessibilityLabel='pilot_in_command'
                  onChange={() => {
                    setFieldValue("pilot_in_command", !values.pilot_in_command);
                    setFieldValue("second_in_command", false);
                    setFieldValue("solo", false);
                  }}
                  isChecked={values.pilot_in_command}
                ></Checkbox>
                <AppText>PIC</AppText>
              </View>

              <View style={styles.checkboxContainer}>
                <Checkbox
                  style={styles.checkbox}
                  value={values.second_in_command}
                  accessibilityLabel='second_in_command'
                  onChange={() => {
                    setFieldValue(
                      "second_in_command",
                      !values.second_in_command
                    );
                    setFieldValue("pilot_in_command", false);
                    setFieldValue("solo", false);
                    setFieldValue("dual", false);
                    setFieldValue("instructor", false);
                  }}
                  isChecked={values.second_in_command}
                ></Checkbox>
                <AppText>SIC</AppText>
              </View>

              <View style={styles.checkboxContainer}>
                <Checkbox
                  style={styles.checkbox}
                  value={values.solo}
                  accessibilityLabel='solo'
                  onChange={() => {
                    setFieldValue("solo", !values.solo);
                    setFieldValue("dual", false);
                    setFieldValue("pilot_in_command", false);
                    setFieldValue("second_in_command", false);
                  }}
                  isChecked={values.solo}
                ></Checkbox>
                <AppText>Solo</AppText>
              </View>

              <View style={styles.checkboxContainer}>
                <Checkbox
                  style={styles.checkbox}
                  value={values.dual}
                  accessibilityLabel='dual'
                  onChange={() => {
                    setFieldValue("dual", !values.dual);
                    setFieldValue("solo", false);
                    setFieldValue("instructor", false);
                  }}
                  isChecked={values.dual}
                ></Checkbox>
                <AppText>Dual</AppText>
              </View>

              <View style={styles.checkboxContainer}>
                <Checkbox
                  style={styles.checkbox}
                  value={values.instructor}
                  accessibilityLabel='instructor'
                  onChange={() => {
                    setFieldValue("instructor", !values.instructor);
                    setFieldValue("dual", false);
                  }}
                  isChecked={values.instructor}
                ></Checkbox>
                <AppText>CFI</AppText>
              </View>

              <View style={styles.checkboxContainer}>
                <Checkbox
                  style={styles.checkbox}
                  value={values.simulator}
                  accessibilityLabel='simulator'
                  onChange={() => {
                    setFieldValue("simulator", !values.simulator);
                    setFieldValue("cross_country", false);
                  }}
                  isChecked={values.simulator}
                ></Checkbox>
                <AppText>Sim</AppText>
              </View>

              <View style={styles.checkboxContainer}>
                <Checkbox
                  style={styles.checkbox}
                  value={values.cross_country}
                  accessibilityLabel='cross_country'
                  onChange={() => {
                    setFieldValue("cross_country", !values.cross_country);
                    setFieldValue("simulator", false);
                  }}
                  isChecked={values.cross_country}
                ></Checkbox>
                <AppText>XC</AppText>
              </View>
            </View>

            <AppTextInput
              value={values.landings_day}
              onChangeText={(val) => {
                setFieldValue("landings_day", parseInt(val));
              }}
              placeholder='Day Landings'
              autoCorrect={false}
              keyboardType={"numeric"}
              clearButtonMode={"while-editing"}
            ></AppTextInput>

            <AppTextInput
              value={values.landings_night}
              onChangeText={(val) => {
                setFieldValue("landings_night", parseInt(val));
              }}
              placeholder='Night Landings'
              autoCorrect={false}
              keyboardType={"numeric"}
              clearButtonMode={"while-editing"}
            ></AppTextInput>

            <AppTextInput
              value={values.instrument}
              onChangeText={(val) => {
                setFieldValue("instrument", parseFloat(val));
              }}
              placeholder='IFR'
              autoCorrect={false}
              keyboardType={"numeric"}
              clearButtonMode={"while-editing"}
            ></AppTextInput>

            <AppTextInput
              value={values.simulated_instrument}
              onChangeText={(val) => {
                setFieldValue("simulated_instrument", parseFloat(val));
              }}
              placeholder='Simulated IFR'
              autoCorrect={false}
              keyboardType={"numeric"}
              clearButtonMode={"while-editing"}
            ></AppTextInput>

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

  checkboxContainer: {
    flex: 0.1,
    flexDirection: "row",
    justifyContent: "space-between",
  },

  checkbox: {
    paddingRight: 3,
  },
});

export default FlightCreateScreen;
