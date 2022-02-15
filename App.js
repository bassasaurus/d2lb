import { StatusBar } from "expo-status-bar";
import React, { useState } from "react";
import DrawerNavigator from "./app/navigation/DrawerNavigator";
import AppContext from "./app/components/AppContext";
import TailnumberForm from "./app/components/TailnumberForm";
import { SafeAreaView } from "react-native";
import TailnumberCreate from "./app/screens/TailnumberCreateScreen";
import TailnumberCreateScreen from "./app/screens/TailnumberCreateScreen";

export default function App() {
  const [isSignedIn, setIsSignedIn] = useState(true);
  const [activityVisible, setActivityVisible] = useState(false);

  const appSettings = {
    isSignedInValue: isSignedIn,
    setIsSignedIn,
    activityVisibleValue: activityVisible,
    setActivityVisible,
  };

  return (
    <>
      <StatusBar style='auto' />
      <AppContext.Provider value={appSettings}>
        <DrawerNavigator></DrawerNavigator>
      </AppContext.Provider>
    </>
  );
}
