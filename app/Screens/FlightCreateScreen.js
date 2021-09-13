import React, { useState } from "react";
import {
  View,
  StyleSheet,
  Text,
  Modal,
  Pressable,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  Button,
  Alert,
} from "react-native";
import { Formik } from "formik";
import * as yup from "yup";

import CalendarPicker from "react-native-calendar-picker";
import AircraftPicker from "../components/AircraftPicker";
import AppTextInput from "../components/AppTextInput";
import TailPicker from "../components/TailPicker";
import ApproachPicker from "../components/ApproachPicker";
import AppText from "../components/AppText";
import Checkbox from "../components/Checkbox";
import api from "../api/axiosConfig";

import { STYLES } from "../styles/styles";
import { ScrollView } from "react-native-gesture-handler";

function FlightCreateScreen(props) {
  const [visible, setVisible] = useState(false);
  const [aircraftId, setAircraftId] = useState("");
  const [formCount, setFormCount] = useState(0);
  const [scrollEnabled, setScrollEnabled] = useState(true);

  const [acTailPair, setAcTailPair] = useState(["", ""]);

  function handleAircraftId(id) {
    setAircraftId(id);
  }

  const dashNotSpace = (str) => {
    str = str.replace(/\s/g, "-");
    return str;
  };

  const post = (data) => {
    api
      .post("/api/flights/", data)
      .then((res) => alert("Form Submitted"))
      .catch((errors) => console.log(errors));
  };

  const required = "*required";
  const positive = "Must be positive number.";

  let flightSchema = yup.object().shape({
    date: yup.string().required(required),
    route: yup.string().required(required),
    aircraft: yup.string().required(required),
    tailnumber: yup.string().required(required),
    duration: yup
      .number()
      .positive(positive)
      .required(required)
      .min(0.1, "Must be greater than 0.1")
      .max(30.0, "Seems unlikely."),
    landings_day: yup
      .number()
      .positive(positive)
      .integer("Integers only, no decimals."),
    landings_night: yup
      .number()
      .positive(positive)
      .integer("Integers only, no decimals."),
    instrument: yup.number().positive(positive),
    simulated_instrument: yup.number().positive(positive),
    remarks: yup.string().max(256, "256 Character Maximum"),
    number: yup.number().positive(positive),
  });

  return (
    <KeyboardAvoidingView
      behavior={Platform.select({ android: undefined, ios: "position" })}
      keyboardVerticalOffset={Platform.select({ ios: 90, android: 78 })}
      enabled={scrollEnabled}
    >
      <ScrollView>
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
              approaches: [
                { approach_type: "", number: "" },
                { approach_type: "", number: "" },
                { approach_type: "", number: "" },
                { approach_type: "", number: "" },
              ],
              remarks: "",
            }}
            validationSchema={flightSchema}
            onSubmit={(values, { setSubmitting }) => {
              setTimeout(() => {
                alert(JSON.stringify(values, null, 2));
                setSubmitting(false);
              }, 400);
            }}
          >
            {({
              values,
              errors,
              isValid,
              touched,
              isSubmitting,
              onSubmit,
              handleChange,
              setFieldValue,
              handleSubmit,
            }) => (
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
                  onFocus={() => setScrollEnabled(false)}
                  onBlur={() => setScrollEnabled(true)}
                />

                <View>
                  {errors.route ? (
                    <Text style={styles.errors}>{errors.route}</Text>
                  ) : (
                    <View>
                      <AppText>Route</AppText>
                    </View>
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
                    setFieldValue("duration", val); //function to return zero if blank
                  }}
                  placeholder='Duration - XX.X'
                  autoCorrect={false}
                  keyboardType={"numeric"}
                  clearButtonMode={"while-editing"}
                  onFocus={() => setScrollEnabled(false)}
                  onBlur={() => setScrollEnabled(true)}
                ></AppTextInput>

                <View>
                  {errors.duration ? (
                    <Text style={styles.errors}>{errors.duration}</Text>
                  ) : (
                    <View>
                      <AppText>Duration</AppText>
                    </View>
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
                      onPress={() => {
                        setFieldValue(
                          "pilot_in_command",
                          !values.pilot_in_command
                        );
                        setFieldValue("second_in_command", false);
                        setFieldValue("solo", false);
                      }}
                      isChecked={values.pilot_in_command}
                    ></Checkbox>
                    <AppText>PIC</AppText>
                  </View>

                  <View style={styles.checkboxContainer}>
                    <Checkbox
                      onPress={() => {
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
                      onPress={() => {
                        setFieldValue("solo", !values.solo);
                        setFieldValue("dual", false);
                        setFieldValue("pilot_in_command", false);
                        setFieldValue("second_in_command", false);
                        setFieldValue("instructor", false);
                        setFieldValue("simulator", false);
                      }}
                      isChecked={values.solo}
                    ></Checkbox>
                    <AppText>Solo</AppText>
                  </View>

                  <View style={styles.checkboxContainer}>
                    <Checkbox
                      onPress={() => {
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
                      onPress={() => {
                        setFieldValue("instructor", !values.instructor);
                        setFieldValue("dual", false);
                        setFieldValue("solo", false);
                      }}
                      isChecked={values.instructor}
                    ></Checkbox>
                    <AppText>CFI</AppText>
                  </View>

                  <View style={styles.checkboxContainer}>
                    <Checkbox
                      onPress={() => {
                        setFieldValue("simulator", !values.simulator);
                        setFieldValue("cross_country", false);
                        setFieldValue("solo", false);
                      }}
                      isChecked={values.simulator}
                    ></Checkbox>
                    <AppText>Sim</AppText>
                  </View>

                  <View style={styles.checkboxContainer}>
                    <Checkbox
                      onPress={() => {
                        setFieldValue("cross_country", !values.cross_country);
                        setFieldValue("simulator", false);
                      }}
                      isChecked={values.cross_country}
                    ></Checkbox>
                    <AppText>XC</AppText>
                  </View>
                </View>

                <AppTextInput
                  value={values.landings_day.toString()}
                  onChangeText={(val) => {
                    setFieldValue("landings_day", val);
                  }}
                  placeholder='Day Landings'
                  autoCorrect={false}
                  keyboardType={"numeric"}
                  clearButtonMode={"while-editing"}
                ></AppTextInput>
                <View>
                  {errors.landings_day ? (
                    <Text style={styles.errors}>{errors.landings_day}</Text>
                  ) : (
                    <View>
                      <AppText>Day Landings</AppText>
                    </View>
                  )}
                </View>

                <AppTextInput
                  value={values.landings_night.toString()}
                  onChangeText={(val) => {
                    setFieldValue("landings_night", val);
                  }}
                  placeholder='Night Landings'
                  autoCorrect={false}
                  keyboardType={"numeric"}
                  clearButtonMode={"while-editing"}
                ></AppTextInput>
                <View>
                  {errors.landings_night ? (
                    <Text style={styles.errors}>{errors.landings_night}</Text>
                  ) : (
                    <View>
                      <AppText>Night Landings</AppText>
                    </View>
                  )}
                </View>

                <AppTextInput
                  value={values.instrument.toString()}
                  onChangeText={(val) => {
                    setFieldValue("instrument", val);
                  }}
                  placeholder='IFR'
                  autoCorrect={false}
                  keyboardType={"numeric"}
                  clearButtonMode={"while-editing"}
                ></AppTextInput>
                <View>
                  {errors.instrument ? (
                    <Text style={styles.errors}>{errors.instrument}</Text>
                  ) : (
                    <View>
                      <AppText>IFR</AppText>
                    </View>
                  )}
                </View>

                <AppTextInput
                  value={values.simulated_instrument.toString()}
                  onChangeText={(val) => {
                    setFieldValue("simulated_instrument", val);
                  }}
                  placeholder='Simulated IFR'
                  autoCorrect={false}
                  keyboardType={"numeric"}
                  clearButtonMode={"while-editing"}
                ></AppTextInput>
                <View>
                  {errors.simulated_instrument ? (
                    <Text style={styles.errors}>
                      {errors.simulated_instrument}
                    </Text>
                  ) : (
                    <View>
                      <AppText>Hood</AppText>
                    </View>
                  )}
                </View>

                <View style={{ flexDirection: "row" }}>
                  <ApproachPicker
                    setFieldValue={setFieldValue}
                    approachKey={"approaches[0].approach_type"}
                    approachValue={values.approaches[0].approach_type}
                    numberKey={"approaches[0].number"}
                    numberValue={values.approaches[0].number}
                  ></ApproachPicker>
                  <View style={styles.clearApproachType}>
                    {formCount == 0 ? (
                      <TouchableOpacity
                        onPress={() => {
                          setFieldValue("approaches[0].approach_type", "");
                          setFieldValue("approaches[0].number", "");
                          setFormCount(0);
                        }}
                      >
                        <AppText
                          style={{
                            color: STYLES.red,
                          }}
                        >
                          Remove
                        </AppText>
                      </TouchableOpacity>
                    ) : (
                      <View></View>
                    )}
                  </View>
                </View>

                {formCount > 0 ? (
                  <View style={{ flexDirection: "row" }}>
                    <ApproachPicker
                      setFieldValue={setFieldValue}
                      approachKey={"approaches[1].approach_type"}
                      approachValue={values.approaches[1].approach_type}
                      numberKey={"approaches[1].number"}
                      numberValue={values.approaches[1].number}
                    ></ApproachPicker>
                    <View style={styles.clearApproachType}>
                      {formCount == 1 ? (
                        <TouchableOpacity
                          onPress={() => {
                            setFieldValue("approaches[1].approach_type", "");
                            setFieldValue("approaches[1].number", "");
                            setFormCount(0);
                          }}
                        >
                          <AppText
                            style={{
                              color: STYLES.red,
                            }}
                          >
                            Remove
                          </AppText>
                        </TouchableOpacity>
                      ) : (
                        <View></View>
                      )}
                    </View>
                  </View>
                ) : (
                  <View></View>
                )}

                {formCount > 1 ? (
                  <View style={{ flexDirection: "row" }}>
                    <ApproachPicker
                      setFieldValue={setFieldValue}
                      approachKey={"approaches[2].approach_type"}
                      approachValue={values.approaches[2].approach_type}
                      numberKey={"approaches[2].number"}
                      numberValue={values.approaches[2].number}
                    ></ApproachPicker>
                    <View style={styles.clearApproachType}>
                      {formCount == 2 ? (
                        <TouchableOpacity
                          onPress={() => {
                            setFieldValue("approaches[2].approach_type", "");
                            setFieldValue("approaches[2].number", "");
                            setFormCount(formCount - 1);
                          }}
                        >
                          <AppText
                            style={{
                              color: STYLES.red,
                            }}
                          >
                            Remove
                          </AppText>
                        </TouchableOpacity>
                      ) : (
                        <View></View>
                      )}
                    </View>
                  </View>
                ) : (
                  <View></View>
                )}

                {formCount > 2 ? (
                  <View style={{ flexDirection: "row" }}>
                    <ApproachPicker
                      setFieldValue={setFieldValue}
                      approachKey={"approaches[3].approach_type"}
                      approachValue={values.approaches[3].approach_type}
                      numberKey={"approaches[3].number"}
                      numberValue={values.approaches[3].number}
                    ></ApproachPicker>
                    <View style={styles.clearApproachType}>
                      {formCount == 3 ? (
                        <TouchableOpacity
                          onPress={() => {
                            setFieldValue("approaches[3].approach_type", "");
                            setFieldValue("approaches[3].number", "");
                            setFormCount(formCount - 1);
                          }}
                        >
                          <AppText
                            style={{
                              color: STYLES.red,
                            }}
                          >
                            Remove
                          </AppText>
                        </TouchableOpacity>
                      ) : (
                        <View></View>
                      )}
                    </View>
                  </View>
                ) : (
                  <View></View>
                )}

                <View style={{ flexDirection: "row" }}>
                  {formCount < 3 ? (
                    <TouchableOpacity
                      onPress={() => setFormCount(formCount + 1)}
                    >
                      <AppText
                        style={{
                          color: STYLES.green,
                          marginRight: 35,
                          marginTop: 10,
                        }}
                      >
                        Add approach
                      </AppText>
                    </TouchableOpacity>
                  ) : (
                    <View style={{ paddingLeft: 125 }}></View>
                  )}
                </View>

                <AppTextInput
                  style={{
                    paddingRight: 10,
                    paddingLeft: 10,
                    height: 80,
                    marginTop: 10,
                    borderWidth: 1,
                    borderRadius: STYLES.borderRadius,
                    borderColor: STYLES.grey,
                  }}
                  value={values.remarks}
                  onChangeText={(val) => {
                    setFieldValue("remarks", val);
                  }}
                  placeholder='Remarks'
                  autoCorrect={false}
                  multiline={true}
                ></AppTextInput>

                <View>
                  {errors.remarks ? (
                    <Text style={styles.errors}>{errors.remarks}</Text>
                  ) : (
                    <View></View>
                  )}
                </View>

                {isValid ? (
                  <Button
                    title='Submit'
                    onPress={() => {
                      onSubmit;
                      post(values);
                    }}
                  ></Button>
                ) : (
                  <Button
                    title='Please complete all required fields'
                    onPress={() => console.log(isValid)}
                  ></Button>
                )}

                {/* <View style={{ marginTop: 30 }}>
                <Text>{JSON.stringify(values, null, "  ")}</Text>
              </View> */}

                <Modal
                  animationType='slide'
                  transparent={true}
                  visible={visible}
                >
                  <View style={styles.centeredView}>
                    <View style={styles.modalView}>
                      <CalendarPicker
                        selectedDayColor='lightblue'
                        onDateChange={(date) => {
                          setFieldValue("date", date.format("M-D-YYYY"));
                          setVisible(false);
                        }}
                      />
                    </View>
                  </View>
                </Modal>
              </>
            )}
          </Formik>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: "column",
    justifyContent: "space-between",
    paddingLeft: 10,
    paddingRight: 10,
    marginBottom: 20,
  },

  modalView: {
    margin: 20,
    backgroundColor: "white",
    borderRadius: 20,
    padding: 35,

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

  clearApproachType: {
    marginLeft: 0,
    marginRight: 10,
    paddingTop: 10,
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
  },
});

export default FlightCreateScreen;
