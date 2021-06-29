import { StatusBar } from "expo-status-bar";
import React from "react";

import { NavigationContainer } from "@react-navigation/native";

import platform from "./app/api/axiosConfig";

import StackNavigator from "./app/navigation/StackNavigator";
import LoginScreen from "./app/screens/LoginScreen";
export default function App() {
  return (
    <>
      <StatusBar style='auto' />
      <NavigationContainer>
        <StackNavigator></StackNavigator>
      </NavigationContainer>
    </>
    // <SafeAreaView>
    //   <LoginScreen></LoginScreen>
    // </SafeAreaView>
  );
}
