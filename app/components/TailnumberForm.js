import React from "react";
import { View, Text, StyleSheet } from "react-native";
import AircraftPicker from "./AircraftPicker";
import { Formik, validateYupSchema } from "formik";
import * as yup from "yup";
import AppTextInput from "./AppTextInput";
import Checkbox from "./Checkbox";

function TailnumberForm(props) {
  return (
    <View style={styles.container}>
      <Formik>
        <>
          <AircraftPicker></AircraftPicker>
          <AppTextInput></AppTextInput>
          <Checkbox></Checkbox>
          <Checkbox></Checkbox>
          <Checkbox></Checkbox>
        </>
      </Formik>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {},
});

export default TailnumberForm;
