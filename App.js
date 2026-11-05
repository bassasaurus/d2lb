import { StatusBar } from "expo-status-bar";
import React, { useEffect, useState, useRef } from "react";
import DrawerNavigator from "./app/navigation/DrawerNavigator";
import AppContext from "./app/components/AppContext";
import * as Sentry from "@sentry/react-native";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { ThemeProvider, useAppTheme } from "./app/theme/ThemeProvider";
import fetchTailnumbers from "./app/api/fetchTailnumbers";


Sentry.init({
  dsn: "https://45a431f2fa3541a09ba6320ae658b609@o369988.ingest.sentry.io/6397150",
  enabled: !__DEV__,
  debug: false, // If `true`, Sentry will try to print out useful debugging information if something goes wrong with sending the event. Set it to `false` in production
});


export default function App() {
  const formGuards = useRef(new Map());
  const [isSignedIn, setIsSignedIn] = useState(false);
  const [activityVisible, setActivityVisible] = useState(false);
  
  const [flightList, setFlightList] = useState([])
  const [offlineFlights, setOfflineFlights] = useState([])

  const appSettings = {
    formGuards,
    isSignedInValue: isSignedIn,
    setIsSignedIn,

    activityVisibleValue: activityVisible,
    setActivityVisible,

    flightListValue: flightList, 
    setFlightList,

    offlineFlightsValue: offlineFlights, 
    setOfflineFlights,
  };

  useEffect(() => {
    const isSignedInHandler = async () => {
      const value = await AsyncStorage.getItem("token");
      if (value !== null) {
        setIsSignedIn(true);
      } else {
        setIsSignedIn(false);
      }
    };
    isSignedInHandler().catch(() => setIsSignedIn(false));
  }, []);

  useEffect(() => {
    if (isSignedIn) {
      fetchTailnumbers().catch(async (error) => {
        if (error.response?.status === 401) {
          await AsyncStorage.removeItem("token");
          setIsSignedIn(false);
        }
        // Network failures keep the cached session available for offline use.
      });
    }
  }, [isSignedIn]);

  return (
    <ThemeProvider>
    <AppAppearance>
    <SafeAreaProvider>
      <AppContext.Provider value={appSettings}>
        <DrawerNavigator></DrawerNavigator>
      </AppContext.Provider>
    </SafeAreaProvider>
    </AppAppearance>
    </ThemeProvider>
  );
}

function AppAppearance({ children }) {
  const { colors, isDark } = useAppTheme();
  return <GestureHandlerRootView style={{ flex: 1, backgroundColor: colors.background }}>
    <StatusBar style={isDark ? 'light' : 'dark'} />
    {children}
  </GestureHandlerRootView>;
}
