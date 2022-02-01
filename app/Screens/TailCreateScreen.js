import React, { useState, useContext, useEffect } from "react";
import { View, StyleSheet } from "react-native";

import AircraftPicker from "../components/AircraftPicker";
import AppTextInput from "../components/AppTextInput";
import Checkbox from "../components/Checkbox";

import { Formik, validateYupSchema } from "formik";
import * as yup from "yup";

import ActivityModal from "../components/ActivityModal";
import AppContext from "../components/AppContext";

function TailCreateScreen(props) {
  const Context = useContext(AppContext);

  const initialValues = {};
  const tailSchema = {};
  return (
    <View style={styles.container}>
      <Formik
        validateOnMount={true}
        initialValues={initialValues}
        validationSchema={tailSchema}
        onSubmit={(values, { setSubmitting }) => {
          setTimeout(() => {
            setSubmitting(false);
            Context.setActivityVisible(true);
          }, 400);
        }}
      ></Formik>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {},
});

export default TailCreateScreen;
