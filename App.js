import { StatusBar } from "expo-status-bar";
import React, { useEffect, useState, useRef } from "react";
import DrawerNavigator from "./app/navigation/DrawerNavigator";
import AppContext from "./app/components/AppContext";
import * as Sentry from "@sentry/react-native";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { session } from "./app/auth/session";
import { ActivityIndicator, Button, View } from "react-native";
import AppText from "./app/components/AppText";
import { ThemeProvider, useAppTheme } from "./app/theme/ThemeProvider";
import fetchTailnumbers from "./app/api/fetchTailnumbers";


Sentry.init({
  dsn: "https://45a431f2fa3541a09ba6320ae658b609@o369988.ingest.sentry.io/6397150",
  enabled: !__DEV__,
  debug: false, // If `true`, Sentry will try to print out useful debugging information if something goes wrong with sending the event. Set it to `false` in production
});


export default function App() {
  const formGuards = useRef(new Map());
  const [auth, setAuth] = useState(session.snapshot());
  const [sessionError, setSessionError] = useState(false);
  const isSignedIn = Boolean(auth.token);
  const restoreSession = () => {
    setSessionError(false);
    session.restore().catch(() => setSessionError(true));
  };
  const [activityVisible, setActivityVisible] = useState(false);
  
  const [flightList, setFlightList] = useState([])
  const [offlineFlights, setOfflineFlights] = useState([])

  const appSettings = {
    formGuards,
    isSignedInValue: isSignedIn,
    signOut: () => session.signOut(),
    sessionReason: auth.reason,

    activityVisibleValue: activityVisible,
    setActivityVisible,

    flightListValue: flightList, 
    setFlightList,

    offlineFlightsValue: offlineFlights, 
    setOfflineFlights,
  };

  useEffect(() => {
    const unsubscribe = session.subscribe(value => {
      setAuth(value);
      setFlightList([]);
      setOfflineFlights([]);
      setActivityVisible(false);
    });
    restoreSession();
    return unsubscribe;
  }, []);

  useEffect(() => {
    if (isSignedIn) fetchTailnumbers().catch(() => {});
    // Authentication rejection is handled centrally; offline errors keep the session.
  }, [isSignedIn, auth.version]);

  return (
    <ThemeProvider>
    <AppAppearance>
    <SafeAreaProvider>
      <AppContext.Provider value={appSettings}>
        {!auth.ready ? <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
          {sessionError ? <><AppText>Could not unlock your saved session.</AppText><Button title="Try again" onPress={restoreSession} /></> : <ActivityIndicator />}
        </View> : <DrawerNavigator />}
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
