import React, { useContext, useState } from "react";
import { View, Text, StyleSheet, SafeAreaView, Button } from "react-native";
import AircraftPicker from "./AircraftPicker";
import { Formik, validateYupSchema, yupToFormErrors } from "formik";
import * as yup from "yup";
import AppTextInput from "./AppTextInput";
import Checkbox from "./Checkbox";
import AppText from "./AppText";
import ActivityModal from "./ActivityModal";
import AppContext from "./AppContext";
import { STYLES } from "../styles/styles";
import { set } from "react-native-reanimated";

function TailnumberForm({ intitialValues }) {
  const initialValues = {};
  const Context = useContext(AppContext);

  const required = "*required";

  let schema = yup.object().shape({
    aircraft: yup.string().required(required),
    registration: yup.string().min(3).max(8).required(required),

    is_91: yup
      .boolean()
      .test("oneOfRequired", "One must be selected", (item, testContext) => {
        return (
          testContext.parent.is_91 ||
          testContext.parent.is_135 ||
          testContext.parent.is_121
        );
      }),
    is_135: yup
      .boolean()
      .test("oneOfRequired", "One must be selected", (item, testContext) => {
        return (
          testContext.parent.is_91 ||
          testContext.parent.is_135 ||
          testContext.parent.is_121
        );
      }),
    is_121: yup
      .boolean()
      .test("oneOfRequired", "One must be selected", (item, testContext) => {
        return (
          testContext.parent.is_91 ||
          testContext.parent.is_135 ||
          testContext.parent.is_121
        );
      }),
  });

  return (
    <View style={styles.container}>
      <Formik
        validateOnMount={true}
        initialValues={{
          aircraft: "",
          registration: "",
          is_91: false,
          is_135: false,
          is_121: false,
        }}
        validationSchema={schema}
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
                isValid={errors.aircraft ? false : true}
                fieldName={"aircraft"}
                setFieldValue={setFieldValue}
              ></AircraftPicker>
              <View>
                {errors.aircraft ? (
                  <Text style={styles.errors}>{errors.aircraft}</Text>
                ) : (
                  <View></View>
                )}
              </View>
              <AppTextInput
                placeholder={"New Tailnumber"}
                onChangeText={handleChange("registration")}
                isValid={errors.registration ? false : true}
                autoCorrect={false}
                autoCapitalize={"characters"}
                keyboardType={"default"}
                clearButtonMode={"while-editing"}
              ></AppTextInput>
              <View>
                {errors.registration ? (
                  <Text style={styles.errors}>{errors.registration}</Text>
                ) : (
                  <View></View>
                )}
              </View>

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

                <View>
                  {errors.is_91 ? (
                    <Text style={styles.errors}>{errors.is_91}</Text>
                  ) : (
                    <View></View>
                  )}
                </View>
              </View>
              {isValid ? (
                <Button
                  title={!Context.setActivityVisible ? "" : "Submit"}
                  onPress={() => {
                    onSubmit;
                    // method(values);
                    setSubmitting(true);
                    Context.setActivityVisible(true);
                  }}
                ></Button>
              ) : (
                <Button title='Complete required fields.'></Button>
              )}

              <View style={{ marginTop: 30 }}>
                <Text>{JSON.stringify(values, null, "  ")}</Text>
              </View>
            </SafeAreaView>
          </>
        )}
      </Formik>
      <ActivityModal></ActivityModal>
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
  errors: {
    color: STYLES.danger,
  },
});

export default TailnumberForm;
