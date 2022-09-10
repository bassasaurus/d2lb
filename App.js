import { StatusBar } from "expo-status-bar";
import React, { useEffect, useState } from "react";
import DrawerNavigator from "./app/navigation/DrawerNavigator";
import AppContext from "./app/components/AppContext";
import * as Sentry from "sentry-expo";
import api from "./app/api/axiosConfig";
import AsyncStorage from "@react-native-async-storage/async-storage";
import getAsyncObject from "./app/asyncStorage/getAsyncObject";
import storeAsyncObject from "./app/asyncStorage/storeAsyncObject";

Sentry.init({
  dsn: "https://45a431f2fa3541a09ba6320ae658b609@o369988.ingest.sentry.io/6397150",
  enableInExpoDevelopment: true,
  debug: true, // If `true`, Sentry will try to print out useful debugging information if something goes wrong with sending the event. Set it to `false` in production
});

export default function App() {
  const [isSignedIn, setIsSignedIn] = useState(true);
  const [activityVisible, setActivityVisible] = useState(false);

  const appSettings = {
    isSignedInValue: isSignedIn,
    setIsSignedIn,
    activityVisibleValue: activityVisible,
    setActivityVisible,
  };

  const fetchData = async () => {
    const response = await api.get("/api/tailnumbers/");
    storeAsyncObject("tailnumbers_data", response.data.results);
  };

  useEffect(() => {
    fetchData();
    const isSignedInHandler = async () => {
      const value = await AsyncStorage.getItem("token");
      if (value !== null) {
        setIsSignedIn(true);
      } else {
        setIsSignedIn(false);
      }
    };
    isSignedInHandler();
  }, []);

  return (
    <>
      <StatusBar style='auto' />
      <AppContext.Provider value={appSettings}>
        <DrawerNavigator></DrawerNavigator>
      </AppContext.Provider>
    </>
  );
}
