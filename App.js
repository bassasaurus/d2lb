import { StatusBar } from "expo-status-bar";
import React from "react";
import {
  Button,
  SafeAreaView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { NavigationContainer } from "@react-navigation/native";
import { createStackNavigator } from "@react-navigation/stack";

import FlightListScreen from "./app/screens/FlightListScreen";
import LoginScreen from "./app/screens/LoginScreen";
import DetailScreen from "./app/screens/DetailScreen";

const Stack = createStackNavigator();

export default function App() {
  return (
    <>
      <StatusBar style='auto' />
      <NavigationContainer>
        <Stack.Navigator>
          <Stack.Screen
            name='Flights'
            component={FlightListScreen}
            options={{ title: "Flights" }}
          />

          <Stack.Screen
            name='Detail'
            component={DetailScreen}
            options={{ title: "Detail" }}
          />
          {(props) => <DetailScreen {...props} id={id} />}
        </Stack.Navigator>
      </NavigationContainer>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#fff",
    alignItems: "center",
    justifyContent: "center",
  },
});
