import React, { useContext } from "react";
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

function TailnumberForm(props) {
  const initialValues = {};
  const Context = useContext(AppContext);

  const required = "*required";

  let schema = yup.object().shape({
    aircraft: yup.string().required(required),
    registration: yup.string().min(3).max(8).required(required),
    reg: yup
      .object({
        is_91: yup.boolean(),
        is_135: yup.boolean(),
        is_121: yup.boolean(),
      })
      .test("oneChecked", "Select 1", (reg) => {
        if (reg.is_91 || reg.is_135 || reg.is_121) {
          return true;
        } else {
          return false;
        }
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
                        setFieldValue("is_135", null);
                        setFieldValue("is_121", null);
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
                        setFieldValue("is_91", null);
                        setFieldValue("is_121", null);
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
                        setFieldValue("is_91", null);
                        setFieldValue("is_135", null);
                      }}
                      isChecked={values.is_121}
                    ></Checkbox>
                    <AppText>121</AppText>
                  </View>
                </View>
                <View>
                  {errors.reg ? (
                    <Text style={styles.errors}>{errors.reg}</Text>
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
