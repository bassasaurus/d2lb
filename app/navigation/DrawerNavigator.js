import React from "react";
import { Alert } from "react-native";
import {
  createDrawerNavigator,
  DrawerContentScrollView,
  DrawerItemList,
  DrawerItem,
} from "@react-navigation/drawer";
import { NavigationContainer } from "@react-navigation/native";
import FlightStackNavigator from "./FlightStackNavigator";
import { SafeAreaView } from "react-native-safe-area-context";
import storeAsyncData from "../asyncStorage/storeAsyncData";
import useAsyncData from "../asyncStorage/useAsyncData";
import LoginScreen from "../screens/LoginScreen";

function DrawerNavigator({ navigation }) {
  const Drawer = createDrawerNavigator();

  const isSignedIn = useAsyncData("isSignedIn");

  console.log(isSignedIn, "DrawerNavigator");

  function CustomDrawerContent(props) {
    return (
      <DrawerContentScrollView {...props}>
        <DrawerItemList {...props} />
        <DrawerItem
          label='Logout'
          onPress={() => {
            Alert.alert("Logged Out");
            storeAsyncData("isSignedIn", "false");
          }}
        />
      </DrawerContentScrollView>
    );
  }
  return (
    <SafeAreaView>
      <NavigationContainer>
        {isSignedIn === "true" ? (
          <Drawer.Navigator
            drawerContent={(props) => <CustomDrawerContent {...props} />}
            initialRouteName='Home'
          >
            <Drawer.Screen name='Flights' component={FlightStackNavigator} />
          </Drawer.Navigator>
        ) : (
          <LoginScreen />
        )}
      </NavigationContainer>
    </SafeAreaView>
  );
}

export default DrawerNavigator;
