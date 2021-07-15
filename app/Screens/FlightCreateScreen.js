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
import CalendarPicker from "react-native-calendar-picker";

function FlightCreateScreen(props) {
  const [visible, setVisible] = useState(false);
  const [date, setDate] = useState(null);

  const closeModal = () => {
    setVisible(false); //hide Modal
  };

  return (
    <View style={styles.container}>
      <Formik initialValues={{ date: "", route: "" }}>
        {({ values, handleChange, setFieldValue }) => (
          <>
            <Pressable
              onPress={() => {
                setVisible(true);
              }}
            >
              <View pointerEvents='none'>
                <TextInput
                  value={values.date.toString()}
                  onChangeText={handleChange("date")}
                  placeholder='Date'
                />
              </View>
            </Pressable>

            <TextInput
              value={values.route}
              onChangeText={handleChange("route")}
              placeholder='Route'
            />

            <Modal animationType='slide' transparent={true} visible={visible}>
              <View style={styles.centeredView}>
                <View style={styles.modalView}>
                  <CalendarPicker
                    showDayStragglers={true}
                    selectedDayColor='lightblue'
                    onDateChange={(date) => {
                      setFieldValue("date", date);
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
