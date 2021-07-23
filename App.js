import { StatusBar } from "expo-status-bar";
import React from "react";
import { SafeAreaView } from "react-native";
import { NavigationContainer } from "@react-navigation/native";

import StackNavigator from "./app/navigation/StackNavigator";
import LoginScreen from "./app/screens/LoginScreen";
import FlightCreateScreen from "./app/screens/FlightCreateScreen";
import Picker from "./app/components/Picker";

export default function App() {
  return (
    <>
      <StatusBar style='auto' />
      <SafeAreaView>
        <FlightCreateScreen></FlightCreateScreen>
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
