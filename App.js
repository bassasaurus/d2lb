import { StatusBar } from "expo-status-bar";
import React from "react";
import DrawerNavigator from "./app/navigation/DrawerNavigator";

export default function App() {
  return (
    <>
      <StatusBar style='auto' />

      <DrawerNavigator></DrawerNavigator>
    </>
  );
}
