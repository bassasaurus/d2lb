import React, { useState, useContext } from "react";
import {
  View,
  StyleSheet,
  SafeAreaView,
  Button,
  Text,
  Image,
  KeyboardAvoidingView,
  ScrollView,
} from "react-native";
import { STYLES } from "../styles/styles";
import AppTextInput from "../components/AppTextInput";
import api from "../api/axiosConfig";
import storeData from "../asyncStorage/storeAsyncData";
import removeAsyncData from "../asyncStorage/removeAsyncData";
import AppContext from "../components/AppContext";
import ActivityModal from "../components/ActivityModal";
import { Formik, validateYupSchema } from "formik";
import * as yup from "yup";

function LoginScreen() {
  const [scrollEnabled, setScrollEnabled] = useState(true);
  const Context = useContext(AppContext);

  const initialValues = {
    username: "",
    password: "",
  };

  const required = "*required";

  let schema = yup.object().shape({
    username: yup.string().email().required(required),
    password: yup.string().required(required),
  });

  const getApiToken = (values) => {
    removeAsyncData("token");

    api({
      method: "post",
      url: "/api/token-auth/",
      data: values,
    })
      .then(function (response) {
        storeData("token", response.data["token"]);
        Context.setIsSignedIn(true);
        Context.setActivityVisible(false);
      })
      .catch(function (error) {
        Context.setActivityVisible(false);
        Context.setIsSignedIn(false);
        if (error.response) {
        } else if (error.request) {
        } else {
        }
      });
  };

  return (
    <SafeAreaView>
      <KeyboardAvoidingView
        behavior={Platform.select({ android: undefined, ios: "position" })}
        keyboardVerticalOffset={Platform.select({ ios: 90, android: 78 })}
        enabled={scrollEnabled}
      >
        <ScrollView>
          <View style={styles.container}>
            <View style={{ paddingTop: 140 }}>
              <Image
                source={require("../assets/D2LB_LOGO_Dark_top.png")}
              ></Image>
            </View>
            <View style={{ paddingTop: 30 }}>
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
                {({ values, errors, isValid, onSubmit, handleChange }) => (
                  <>
                    <AppTextInput
                      placeholder='email'
                      autoCorrect={false}
                      autoCapitalize={"none"}
                      keyboardType={"default"}
                      clearButtonMode={"while-editing"}
                      onChangeText={handleChange("username")}
                      isValid={errors.username ? false : true}
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
                    ></AppTextInput>
                    <View>
                      {errors.password ? (
                        <Text style={styles.errors}>{errors.password}</Text>
                      ) : (
                        <View></View>
                      )}
                    </View>
                    <View style={{ paddingTop: 10 }}>
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

const styles = StyleSheet.create({
  container: { marginRight: 10, marginLeft: 10 },
  errors: {
    color: STYLES.danger,
  },
});

export default LoginScreen;
