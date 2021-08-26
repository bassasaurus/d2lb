import { StatusBar } from "expo-status-bar";
import React from "react";
import { SafeAreaView } from "react-native";
import { NavigationContainer } from "@react-navigation/native";

import { NativeBaseProvider, Box } from "native-base";

import StackNavigator from "./app/navigation/StackNavigator";
import LoginScreen from "./app/screens/LoginScreen";
import FlightCreateScreen from "./app/screens/FlightCreateScreen";
import Picker from "./app/components/AircraftPicker";
import ApproachPicker from "./app/components/ApproachPicker";
import Checkbox from "./app/components/Checkbox";

export default function App() {
  return (
    <>
      <StatusBar style='auto' />
      <SafeAreaView>
        <Checkbox></Checkbox>
      </SafeAreaView>

      {/* <NavigationContainer>
        <StackNavigator></StackNavigator>
      </NavigationContainer> */}
    </>
    // <SafeAreaView>
    //   <LoginScreen></LoginScreen>
    // </SafeAreaView>
  );
}
