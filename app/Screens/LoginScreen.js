import Card from '../components/Card';
import PrimaryActionButton from '../components/PrimaryActionButton';
import { ScrollView } from '../components/OverflowLists';
import { useMemo } from 'react';
import React, { useState, useContext, useRef } from "react";
import { Alert, Platform, View, StyleSheet, Image, KeyboardAvoidingView, Pressable } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { SafeAreaView } from "react-native-safe-area-context";
import { useAppTheme } from '../theme/ThemeProvider';
import AppTextInput from "../components/AppTextInput";
import api from "../api/axiosConfig";
import { session } from "../auth/session";
import AppContext from "../components/AppContext";
import ActivityModal from "../components/ActivityModal";
import { Formik } from "formik";
import * as yup from "yup";
import AppText from "../components/AppText";

function LoginScreen() {
  const { styles: STYLES } = useAppTheme();
  const styles = useMemo(() => createStyles(STYLES), [STYLES]);
  const [passwordSecure, setPasswordSecure] = useState(true);
  const Context = useContext(AppContext);
  const signingIn = useRef(false);

  const initialValues = {
    username: "",
    password: "",
  };

  const required = "Required";

  let schema = yup.object().shape({
    username: yup.string().email("Valid email required").required(required),
    password: yup.string().required(required),
  });

  const getApiToken = async (values, { setSubmitting, setFieldValue }) => {
    if (signingIn.current) return;
    signingIn.current = true;
    Context.setActivityVisible(true);
    try {
      const response = await api.post('/api/token-auth/', values, { skipAuth: true });
      await session.signIn(response.data.token);
      setFieldValue('password', '', false);
    } catch (error) {
      Alert.alert('Unable to sign in', error.response?.status === 400 || error.response?.status === 401
        ? 'Check your email and password and try again.'
        : error.response?.status === 429 ? 'Too many attempts. Please wait before trying again.'
        : error.response ? 'Sign-in could not be completed. Please try again.'
        : error.request ? 'Cannot reach the server. Check your connection and try again.'
        : 'Could not securely save your session. Please try again.');
    } finally {
      signingIn.current = false;
      Context.setActivityVisible(false);
      setSubmitting(false);
    }
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: STYLES.itemBackground }}>
      <KeyboardAvoidingView
        behavior={Platform.select({ android: undefined, ios: "position" })}
        keyboardVerticalOffset={Platform.select({ ios: 90, android: 78 })}
        enabled={true}
      >
        <ScrollView keyboardShouldPersistTaps="handled">
          <View style={styles.container}>
            <View style={{ paddingTop: 100, alignItems: "center" }}>
              <Image
                source={require("../assets/D2LB_LOGO_Dark_top.png")}
                accessibilityLabel="Direct2Logbook"
                resizeMode="contain"
                style={{ width: '100%', maxWidth: 334, height: 77, tintColor: STYLES.text }}
              />
              <View style={{ marginTop: 10 }}>
                <AppText size={18}>No memory items. No limitations.</AppText>
              </View>
            </View>
            <Card compact style={styles.card}>
              {Context.sessionReason === 'expired' && <AppText>Your session is no longer valid. Sign in again. Your saved offline changes are still on this device.</AppText>}
              <Formik
                validateOnMount={false}
                initialValues={initialValues}
                validationSchema={schema}
                onSubmit={getApiToken}
              >
                {({
                  values,
                  errors,
                  isValid,
                  handleSubmit,
                  isSubmitting,
                  handleChange,
                  handleBlur,
                }) => (
                  <>
                    <AppTextInput
                      style={styles.input}
                      testID="login-email"
                      placeholder='email'
                      autoCorrect={false}
                      autoCapitalize={"none"}
                      keyboardType={"default"}
                      clearButtonMode={"while-editing"}
                      onChangeText={handleChange("username")}
                      isValid={errors.username ? false : true}
                      onBlur={handleBlur("username")}
                      value={values.username}
                      autoComplete="username"
                      textContentType="username"
                    ></AppTextInput>
                    {errors.username && <AppText style={styles.errors}>{errors.username}</AppText>}
                    <View style={styles.passwordField}>
                      <AppTextInput
                        style={[styles.input, styles.passwordInput]}
                        testID="login-password"
                        placeholder="password"
                        autoCorrect={false}
                        autoCapitalize="none"
                        onChangeText={handleChange("password")}
                        isValid={!errors.password}
                        textContentType="password"
                        autoComplete="current-password"
                        value={values.password}
                        secureTextEntry={passwordSecure}
                        onBlur={handleBlur("password")}
                      />
                      <Pressable
                        accessibilityRole="button"
                        accessibilityLabel={passwordSecure ? 'Show password' : 'Hide password'}
                        onPress={() => setPasswordSecure(secure => !secure)}
                        style={styles.passwordToggle}
                      >
                        <MaterialCommunityIcons name={passwordSecure ? 'eye-outline' : 'eye-off-outline'}
                          size={22} color={STYLES.muted} accessible={false} />
                      </Pressable>
                    </View>
                    {errors.password && <AppText style={styles.errors}>{errors.password}</AppText>}
                    <View style={styles.submit}>
                      <PrimaryActionButton testID="login-submit" title={isSubmitting ? 'Signing in…' : 'Sign in'}
                        disabled={!isValid || isSubmitting || !values.username || !values.password}
                        onPress={handleSubmit} />
                    </View>
                  </>
                )}
              </Formik>
            </Card>
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
  card: {
    marginTop: 14,
    marginBottom: 8,
    ...Platform.select({ android: { paddingBottom: 6 } }),
  },
  submit: { marginTop: Platform.OS === 'android' ? 8 : 4 },
  input: { marginTop: 0 },
  passwordField: { marginTop: 8 },
  passwordInput: { paddingRight: 46 },
  passwordToggle: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    right: 1,
    width: 44,
    justifyContent: 'center',
    alignItems: 'center',
  },
  errors: {
    color: STYLES.danger,
  },
});

export default LoginScreen;
