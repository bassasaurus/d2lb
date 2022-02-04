import React from "react";
import { View, Text, StyleSheet, SafeAreaView } from "react-native";
import AircraftPicker from "./AircraftPicker";
import { Formik, validateYupSchema } from "formik";
import * as yup from "yup";
import AppTextInput from "./AppTextInput";
import Checkbox from "./Checkbox";
import AppText from "./AppText";

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
            <SafeAreaView>
              <AircraftPicker
                initialValue={initialValues.aircraft}
                isValid={values.aircraft_type ? true : false}
                fieldName={"aircraft"}
                setFieldValue={setFieldValue}
              ></AircraftPicker>
              <AppTextInput placeholder={"New Tailnumber"}></AppTextInput>
              <View style={{ flexDirection: "row" }}>
                <Checkbox></Checkbox>
                <AppText>121</AppText>
                <Checkbox></Checkbox>
                <AppText>135</AppText>
                <Checkbox></Checkbox>
                <AppText>91</AppText>
              </View>

              <View style={{ marginTop: 30 }}>
                <Text>{JSON.stringify(values, null, "  ")}</Text>
              </View>
            </SafeAreaView>
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
