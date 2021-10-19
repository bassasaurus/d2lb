import React, { useState } from "react";
import { StyleSheet, Alert } from "react-native";
import {
  createDrawerNavigator,
  DrawerContentScrollView,
  DrawerItemList,
  DrawerItem,
} from "@react-navigation/drawer";
import { NavigationContainer } from "@react-navigation/native";
import LoginScreen from "../screens/LoginScreen";
import FlightStackNavigator from "./FlightStackNavigator";
import { createStackNavigator } from "@react-navigation/stack";
import AsyncStorage, {
  useAsyncStorage,
} from "@react-native-async-storage/async-storage";
import storeAsyncData from "../asyncStorage/storeAsyncData";
import { SafeAreaView } from "react-native-safe-area-context";

function DrawerNavigator({ navigation }) {
  const isSignedIn = true;
  const Drawer = createDrawerNavigator();

  function CustomDrawerContent(props) {
    return (
      <DrawerContentScrollView {...props}>
        <DrawerItemList {...props} />
        <DrawerItem
          label='Logout'
          onPress={() => {
            Alert.alert("Logged Out");
          }}
        />
      </DrawerContentScrollView>
    );
  }

  if (isSignedIn) {
    return (
      <NavigationContainer>
        <Drawer.Navigator
          drawerContent={(props) => <CustomDrawerContent {...props} />}
          initialRouteName='Home'
        >
          <Drawer.Screen name='Flights' component={FlightStackNavigator} />
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
