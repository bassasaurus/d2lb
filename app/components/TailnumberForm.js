import React from "react";
import { View, Text, StyleSheet } from "react-native";
import AircraftPicker from "./AircraftPicker";
import { Formik, validateYupSchema } from "formik";
import * as yup from "yup";
import AppTextInput from "./AppTextInput";
import Checkbox from "./Checkbox";

function TailnumberForm(props) {
  const initialValues = {};

  return (
    <View style={styles.container}>
      <Formik
        validateOnMount={true}
        initialValues={initialValues}
        // validationSchema={flightSchema}
        onSubmit={(values, { setSubmitting }) => {
          setTimeout(() => {
            setSubmitting(false);
            Context.setActivityVisible(true);
          }, 400);
        }}
      >
        {({
          values,
          errors,
          isValid,
          onSubmit,
          handleChange,
          setFieldValue,
        }) => (
          <>
            <AircraftPicker></AircraftPicker>
            <AppTextInput></AppTextInput>
            <Checkbox></Checkbox>
            <Checkbox></Checkbox>
            <Checkbox></Checkbox>

            <View style={{ marginTop: 30 }}>
              <Text>{JSON.stringify(values, null, "  ")}</Text>
            </View>
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
    marginBottom: 20,
  },
});

export default TailnumberForm;
