import { StatusBar } from "expo-status-bar";
import React, { useState } from "react";
import DrawerNavigator from "./app/navigation/DrawerNavigator";
import { AppContext } from "./app/components/AppContext";

export default function App() {
  const [isSignedIn, setIsSignedIn] = useState(false);

  const appSettings = {
    isSignedInValue: isSignedIn,
    setIsSignedIn,
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
