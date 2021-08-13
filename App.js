import { StatusBar } from "expo-status-bar";
import React from "react";
import { SafeAreaView } from "react-native";
import { NavigationContainer } from "@react-navigation/native";

import { NativeBaseProvider, Box } from "native-base";

import StackNavigator from "./app/navigation/StackNavigator";
import LoginScreen from "./app/screens/LoginScreen";
import FlightCreateScreen from "./app/screens/FlightCreateScreen";
import Picker from "./app/components/AircraftPicker";

export default function App() {
  return (
    <>
      <NativeBaseProvider>
        <Box flex={1} bg='#fff' alignItems='center' justifyContent='center'>
          <StatusBar style='auto' />
          <SafeAreaView>
            <FlightCreateScreen></FlightCreateScreen>
          </SafeAreaView>
        </Box>
      </NativeBaseProvider>

      {/* <NavigationContainer>
        <StackNavigator></StackNavigator>
      </NavigationContainer> */}
    </>
    // <SafeAreaView>
    //   <LoginScreen></LoginScreen>
    // </SafeAreaView>
  );
}
