import { StatusBar } from "expo-status-bar";
import React from "react";
import { SafeAreaView } from "react-native";
import { NavigationContainer } from "@react-navigation/native";

import { NativeBaseProvider, Box } from "native-base";

import StackNavigator from "./app/navigation/StackNavigator";
import LoginScreen from "./app/screens/LoginScreen";
import FlightCreateScreen from "./app/screens/FlightCreateScreen";
import ApproachPicker from "./app/components/ApproachPicker";

export default function App() {
  return (
    <>
      <StatusBar style='auto' />
      {/* <SafeAreaView> */}
      {/* <ApproachPicker></ApproachPicker> */}
      {/* <FlightCreateScreen></FlightCreateScreen> */}

      {/* <LoginScreen></LoginScreen> */}
      {/* </SafeAreaView> */}

      <NavigationContainer>
        <StackNavigator></StackNavigator>
      </NavigationContainer>
    </>
  );
}
