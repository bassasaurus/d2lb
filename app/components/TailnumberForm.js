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
              <AppTextInput
                placeholder={"New Tailnumber"}
                // isValid={values.registration.length > 2 ? true : false}
                onChangeText={handleChange("registraion")}
                placeholder='Route'
                autoCorrect={false}
                autoCapitalize={"characters"}
                keyboardType={"default"}
                clearButtonMode={"while-editing"}
              ></AppTextInput>
              <View
                style={{
                  flexDirection: "row",
                  marginTop: 10,
                }}
              >
                <View style={{ flex: 0.3 }}>
                  <View style={{ flexDirection: "row" }}>
                    <Checkbox
                      onPress={() => {
                        setFieldValue("is_91", !values.is_91);
                        setFieldValue("is_135", false);
                        setFieldValue("is_121", false);
                      }}
                      isChecked={values.is_91}
                    ></Checkbox>
                    <AppText>91</AppText>
                  </View>
                </View>
                <View style={{ flex: 0.3 }}>
                  <View style={{ flexDirection: "row" }}>
                    <Checkbox
                      onPress={() => {
                        setFieldValue("is_135", !values.is_135);
                        setFieldValue("is_91", false);
                        setFieldValue("is_121", false);
                      }}
                      isChecked={values.is_135}
                    ></Checkbox>
                    <AppText>135</AppText>
                  </View>
                </View>
                <View style={{ flex: 0.3 }}>
                  <View style={{ flexDirection: "row" }}>
                    <Checkbox
                      onPress={() => {
                        setFieldValue("is_121", !values.is_121);
                        setFieldValue("is_91", false);
                        setFieldValue("is_135", false);
                      }}
                      isChecked={values.is_121}
                    ></Checkbox>
                    <AppText>121</AppText>
                  </View>
                </View>
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
