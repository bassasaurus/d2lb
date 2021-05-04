import { StatusBar } from "expo-status-bar";
import React from "react";

import { NavigationContainer } from "@react-navigation/native";

import StackNavigator from "./app/navigation/StackNavigator";

export default function App() {
  return (
    <>
      <StatusBar style='auto' />
      <NavigationContainer>
        <StackNavigator></StackNavigator>
      </NavigationContainer>
    </>
  );
}
