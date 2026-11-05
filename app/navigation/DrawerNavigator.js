import React, { useContext, useEffect } from "react";
import { StyleSheet, Alert } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { flightScope, flightStore } from "../storage/flights";
import { SafeAreaView } from "react-native-safe-area-context";
import {
  createDrawerNavigator,
  DrawerContentScrollView,
  DrawerItemList,
  DrawerItem,
} from "@react-navigation/drawer";
import { NavigationContainer } from "@react-navigation/native";
import { createStackNavigator } from "@react-navigation/stack";
import LoginScreen from "../Screens/LoginScreen";
import SyncReviewStackNavigator from "./SyncReviewStackNavigator";
import AircraftStackNavigator from "./AircraftStackNavigator";
import { aircraftScope } from "../storage/aircraft";
import FlightStackNavigator from "./FlightStackNavigator";
import AppContext from "../components/AppContext";
import removeAsyncData from "../asyncStorage/removeAsyncData";

const Drawer = createDrawerNavigator();
const Root = createStackNavigator();

function DrawerNavigator({ navigation }) {
  const Context = useContext(AppContext);


  function LogoutContent(props) {
    return (
      <DrawerContentScrollView {...props}>
        <DrawerItemList {...props} />
        <DrawerItem
          label='Logout'
          onPress={async () => {
            const logout = async () => {
              await AsyncStorage.removeItem("token");
              Context.setIsSignedIn(false);
            };
            try {
              const forms = [...Context.formGuards.current.values()].map(read => read());
              if (forms.some(form => form.saving)) {
                Alert.alert("Saving changes", "Please wait until this save finishes.");
                return;
              }
              const dirty = forms.some(form => form.dirty);
              const store = await flightStore();
              const scope = await flightScope();
              const pending = await store.pendingCount(scope) + await store.pendingCount(aircraftScope(scope));
              if (dirty || pending) {
                const message = [
                  dirty ? "Your unfinished form changes will be discarded." : "",
                  pending ? `${pending} change(s) are saved only on this device. They will remain stored, but will be hidden while signed out.` : "",
                ].filter(Boolean).join("\n\n");
                Alert.alert(dirty ? "Discard changes and sign out?" : "Unsynced flights", message, [
                  { text: dirty ? "Keep editing" : "Stay signed in", style: "cancel" },
                  { text: dirty ? "Discard and sign out" : "Sign out", style: dirty ? "destructive" : "default",
                    onPress: () => logout().catch(() => Alert.alert("Unable to sign out")) },
                ]);
              } else {
                await logout();
              }
            } catch (error) {
              Alert.alert("Unable to sign out", "Could not check your pending changes. Please try again.");
            }
          }}
        />
      </DrawerContentScrollView>
    );
  }

  if (Context.isSignedInValue) {
    return (
      <NavigationContainer>
        <Root.Navigator screenOptions={{ headerShown: false }}>
          <Root.Screen name="MainDrawer">
            {() => <Drawer.Navigator drawerContent={(props) => <LogoutContent {...props} />}>
              <Drawer.Screen name="Logbook" component={FlightStackNavigator} options={{ headerShown: false }} />
              <Drawer.Screen name="Aircraft" component={AircraftStackNavigator} options={{ headerShown: false }} />
            </Drawer.Navigator>}
          </Root.Screen>
          <Root.Screen name="SyncReview" component={SyncReviewStackNavigator} options={{ presentation: 'modal' }} />
        </Root.Navigator>
      </NavigationContainer>
    );
  } else {
    return (
      <SafeAreaView>
        <LoginScreen />
      </SafeAreaView>
    );
  }
}

const styles = StyleSheet.create({
  container: {},
});

export default DrawerNavigator;
