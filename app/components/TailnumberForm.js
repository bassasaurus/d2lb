import React, { useContext, useState } from "react";
import { View, Text, StyleSheet, SafeAreaView, Button } from "react-native";
import AircraftPicker from "./AircraftPicker";
import { Formik, validateYupSchema } from "formik";
import * as yup from "yup";
import AppTextInput from "./AppTextInput";
import Checkbox from "./Checkbox";
import AppText from "./AppText";
import ActivityModal from "./ActivityModal";
import AppContext from "./AppContext";
import { STYLES } from "../styles/styles";

function TailnumberForm({ initialValues, method }) {
  const Context = useContext(AppContext);

  const [checkValid, setCheckValid] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const checkboxValidation = (is91, is135, is121) => {
    if (is91 || is135 || is121) {
      setCheckValid(true);

      return true;
    } else {
      setCheckValid(false);

      return false;
    }
  };

  const required = "*required";

  let schema = yup.object().shape({
    aircraft: yup.string().required(required),
    registration: yup.string().min(3).max(8).required(required),
    is_91: yup.boolean().test({
      name: "check91",
      message: "Must select one.",
      test: (checkValid) => true,
    }),
    is_135: yup.boolean().test({
      name: "check135",
      message: "Must select one.",
      test: (checkValid) => true,
    }),
    is_121: yup.boolean().test({
      name: "check121",
      message: "Must select one.",
      test: (checkValid) => true,
    }),
  });

  return (
    <View style={styles.container}>
      <Formik
        validateOnMount={true}
        initialValues={initialValues}
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
                initialValue={initialValues ? initialValues.registration : ""}
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
                      initialValue={initialValues.is_91}
                      onPress={() => {
                        setFieldValue("is_91", !values.is_91);
                        setFieldValue("is_135", false);
                        setFieldValue("is_121", false);
                        checkboxValidation(!values.is_91, false, false);
                      }}
                      isChecked={values.is_91}
                    ></Checkbox>
                    <AppText>91</AppText>
                  </View>
                </View>
                <View style={{ flex: 0.3 }}>
                  <View style={{ flexDirection: "row" }}>
                    <Checkbox
                      initialValue={initialValues.is_135}
                      onPress={() => {
                        setFieldValue("is_135", !values.is_135);
                        setFieldValue("is_91", false);
                        setFieldValue("is_121", false);
                        checkboxValidation(false, !values.is_135, false);
                      }}
                      isChecked={values.is_135}
                    ></Checkbox>
                    <AppText>135</AppText>
                  </View>
                </View>
                <View style={{ flex: 0.3 }}>
                  <View style={{ flexDirection: "row" }}>
                    <Checkbox
                      initialValue={initialValues.is_121}
                      onPress={() => {
                        setFieldValue("is_121", !values.is_121);
                        setFieldValue("is_91", false);
                        setFieldValue("is_135", false);
                        checkboxValidation(false, false, !values.is_121);
                      }}
                      isChecked={values.is_121}
                    ></Checkbox>
                    <AppText>121</AppText>
                  </View>
                </View>

                <View>
                  {!checkValid ? (
                    <View>
                      <Text style={styles.errors}>Must select one</Text>
                    </View>
                  ) : (
                    <View></View>
                  )}
                </View>
              </View>
              {isValid && checkValid ? (
                <Button
                  title={!Context.setActivityVisible ? "" : "Submit"}
                  onPress={() => {
                    onSubmit;
                    method(values);
                    setSubmitting(true);
                    Context.setActivityVisible(true);
                  }}
                ></Button>
              ) : (
                <Button title='Complete required fields.'></Button>
              )}

              {/* <View style={{ marginTop: 30 }}>
                <Text>{JSON.stringify(values, null, "  ")}</Text>
              </View> */}
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
