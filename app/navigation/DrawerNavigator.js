import React, { useContext, useEffect } from "react";
import { StyleSheet, SafeAreaView } from "react-native";
import {
  createDrawerNavigator,
  DrawerContentScrollView,
  DrawerItemList,
  DrawerItem,
} from "@react-navigation/drawer";
import { NavigationContainer } from "@react-navigation/native";
import LoginScreen from "../Screens/LoginScreen";
import FlightStackNavigator from "./FlightStackNavigator";
import AppContext from "../components/AppContext";
import removeAsyncData from "../asyncStorage/removeAsyncData";

function DrawerNavigator({ navigation }) {
  const Context = useContext(AppContext);

  const Drawer = createDrawerNavigator();

  function LogoutContent(props) {
    return (
      <DrawerContentScrollView {...props}>
        <DrawerItemList {...props} />
        <DrawerItem
          label='Logout'
          onPress={() => {
            removeAsyncData("token");
            Context.setIsSignedIn(false);
          }}
        />
      </DrawerContentScrollView>
    );
  }

  if (Context.isSignedInValue) {
    return (
      <NavigationContainer>
        <Drawer.Navigator
          drawerContent={(props) => <LogoutContent {...props} />}
        >
          <Drawer.Screen
            name='Logbook'
            component={FlightStackNavigator}
            options={{ headerShown: false }}
          />
        </Drawer.Navigator>
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
