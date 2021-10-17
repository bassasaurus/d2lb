import React from "react";
import { Button, View, StyleSheet } from "react-native";
import { createDrawerNavigator } from "@react-navigation/drawer";
import { NavigationContainer } from "@react-navigation/native";
import FlightListScreen from "../screens/FlightListScreen";
import LoginScreen from "../screens/LoginScreen";
function DrawerNavigator(props) {
  const Drawer = createDrawerNavigator();
  return (
    <NavigationContainer>
      <Drawer.Navigator initialRouteName='Home'>
        <Drawer.Screen name='Flights' component={FlightListScreen} />
        <Drawer.Screen name='Notifications' component={LoginScreen} />
      </Drawer.Navigator>
    </NavigationContainer>
  );
}

const styles = StyleSheet.create({
  container: {},
});

export default DrawerNavigator;
