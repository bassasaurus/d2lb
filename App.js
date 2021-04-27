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

import FlightListScreen from "./app/screens/FlightListScreen";
import LoginScreen from "./app/screens/LoginScreen";

export default function App() {
  return (
    <>
      <StatusBar style='auto' />
      <View style={styles.container}>
        <FlightListScreen />
      </View>
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
