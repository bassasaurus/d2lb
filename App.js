import { StatusBar } from "expo-status-bar";
import React from "react";
import { SafeAreaView } from "react-native";
import { NavigationContainer } from "@react-navigation/native";

import StackNavigator from "./app/navigation/StackNavigator";
import LoginScreen from "./app/screens/LoginScreen";

export default function App() {
  return (
    <>
      <StatusBar style='auto' />
      {/* <SafeAreaView> */}

      {/* <LoginScreen></LoginScreen> */}
      {/* </SafeAreaView> */}

      <NavigationContainer>
        <StackNavigator></StackNavigator>
      </NavigationContainer>
    </>
  );
}
