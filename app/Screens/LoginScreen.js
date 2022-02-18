import React, { useState, useContext } from "react";
import { View, StyleSheet } from "react-native";
import { STYLES } from "../styles/styles";
import AppButton from "../components/AppButton";
import AppTextInput from "../components/AppTextInput";
import api from "../api/axiosConfig";
import storeData from "../asyncStorage/storeAsyncData";
import removeAsyncData from "../asyncStorage/removeAsyncData";
import AppContext from "../components/AppContext";
import ActivityModal from "../components/ActivityModal";
import { Formik, validateYupSchema } from "formik";
import * as yup from "yup";

function LoginScreen() {
  const Context = useContext(AppContext);

  const initialValues = {
    username: "",
    password: "",
  };

  const required = "*required";

  let schema = yup.object().shape({
    username: yup.string().required(required),
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
            <AppTextInput placeholder='email'></AppTextInput>
            <AppTextInput placeholder='password'></AppTextInput>
          </>
        )}
      </Formik>
      <ActivityModal visible={Context.activityVisibleValue}></ActivityModal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingTop: 300,
    flexDirection: "column",
    justifyContent: "center",
    alignItems: "center",
    width: "100%",
  },
});

export default LoginScreen;
