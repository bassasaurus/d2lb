import { useMemo } from 'react';
import React, { useState, useContext } from "react";
import { Alert, Platform, View, StyleSheet, Button, Image, KeyboardAvoidingView, ScrollView, Pressable, TouchableNativeFeedbackBase } from 'react-native';
import Text from '../components/AppText';
import { SafeAreaView } from "react-native-safe-area-context";
import { useAppTheme } from '../theme/ThemeProvider';
import AppTextInput from "../components/AppTextInput";
import api from "../api/axiosConfig";
import AsyncStorage from "@react-native-async-storage/async-storage";
import removeAsyncData from "../asyncStorage/removeAsyncData";
import AppContext from "../components/AppContext";
import ActivityModal from "../components/ActivityModal";
import { Formik, validateYupSchema } from "formik";
import * as yup from "yup";
import AppText from "../components/AppText";

function LoginScreen() {
  const { styles: STYLES } = useAppTheme();
  const styles = useMemo(() => createStyles(STYLES), [STYLES]);
  const [passwordSecure, setPasswordSecure] = useState(true);
  const Context = useContext(AppContext);

  const initialValues = {
    username: "",
    password: "",
  };

  const required = "Required";

  let schema = yup.object().shape({
    username: yup.string().email("Valid email required").required(required),
    password: yup.string().min(8, "Min 8 characters").required(required),
  });

  const getApiToken = (values) => {
    removeAsyncData("token");

    api({
      method: "post",
      url: "/api/token-auth/",
      data: values,
    })
      .then(async function (response) {
        await AsyncStorage.setItem("token", response.data["token"]);
        Context.setIsSignedIn(true);
        Context.setActivityVisible(false);
      })
      .catch(function (error) {
        Context.setActivityVisible(false);
        Context.setIsSignedIn(false);
        Alert.alert(
          "Unable to sign in",
          error.response
            ? "Check your login details and try again."
            : "Cannot reach the server. Check that your local Django server is running."
        );
      });
  };

  return (
    <SafeAreaView>
      <KeyboardAvoidingView
        behavior={Platform.select({ android: undefined, ios: "position" })}
        keyboardVerticalOffset={Platform.select({ ios: 90, android: 78 })}
        enabled={true}
      >
        <ScrollView>
          <View style={styles.container}>
            <View style={{ paddingTop: 100, alignItems: "center" }}>
              <View style={{ backgroundColor: "#fff", padding: 10, borderRadius: 8 }}>
              <Image
                source={require("../assets/D2LB_LOGO_Dark_top.png")}
              ></Image>
              </View>
              <View style={{ marginTop: 10 }}>
                <AppText size={18}>No memory items. No limitations.</AppText>
              </View>
            </View>
            <View style={{ paddingTop: 15 }}>
              <Formik
                validateOnMount={false}
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
                  touched,
                  handleChange,
                  handleBlur,
                }) => (
                  <>
                    <AppTextInput
                      placeholder='email'
                      autoCorrect={false}
                      autoCapitalize={"none"}
                      keyboardType={"default"}
                      clearButtonMode={"while-editing"}
                      onChangeText={handleChange("username")}
                      isValid={errors.username ? false : true}
                      onblur={handleBlur("username")}
                    ></AppTextInput>
                    <View>
                      {errors.username ? (
                        <Text style={styles.errors}>{errors.username}</Text>
                      ) : (
                        <View></View>
                      )}
                    </View>
                    <AppTextInput
                      placeholder='password'
                      autoCorrect={false}
                      autoCapitalize={"none"}
                      keyboardType={"default"}
                      clearButtonMode={"while-editing"}
                      password={true}
                      onChangeText={handleChange("password")}
                      isValid={errors.password ? false : true}
                      textContentType='password'
                      secureTextEntry={passwordSecure}
                      onBlur={handleBlur("password")}
                    ></AppTextInput>
                    <View
                      style={{
                        flexDirection: "row",
                        justifyContent: "space-between",
                      }}
                    >
                      <View>
                        {errors.password ? (
                          <Text style={styles.errors}>{errors.password}</Text>
                        ) : (
                          <View></View>
                        )}
                      </View>

                      <Pressable
                        onPress={() => setPasswordSecure(!passwordSecure)}
                      >
                        {passwordSecure ? (
                          <AppText color={STYLES.muted}>show</AppText>
                        ) : (
                          <AppText color={STYLES.muted}>hide</AppText>
                        )}
                      </Pressable>
                    </View>

                    <View style={{ marginTop: 10 }}>
                      {isValid ? (
                        <Button
                          title={!Context.setActivityVisible ? "" : "Submit"}
                          onPress={() => {
                            onSubmit;
                            getApiToken(values);
                            Context.setActivityVisible(true);
                          }}
                        ></Button>
                      ) : (
                        <Button title='Complete required fields.'></Button>
                      )}
                    </View>
                  </>
                )}
              </Formik>
            </View>
            <ActivityModal
              visible={Context.activityVisibleValue}
            ></ActivityModal>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const createStyles = STYLES => StyleSheet.create({
  container: { flexDirection: "column", marginRight: 10, marginLeft: 10 },
  errors: {
    color: STYLES.danger,
  },
});

export default LoginScreen;
