import { StatusBar } from "expo-status-bar";
import React from "react";
import { SafeAreaView } from "react-native";
import { NavigationContainer } from "@react-navigation/native";

import LoginScreen from "./app/screens/LoginScreen";
import DrawerNavigator from "./app/navigation/DrawerNavigator";

export default function App() {
  return (
    <>
      <StatusBar style='auto' />
      {/* <SafeAreaView> */}

      {/* <LoginScreen></LoginScreen> */}
      {/* </SafeAreaView> */}

      {/* <NavigationContainer>
        <StackNavigator></StackNavigator>
      </NavigationContainer> */}

      <DrawerNavigator></DrawerNavigator>
    </>
  );
}
