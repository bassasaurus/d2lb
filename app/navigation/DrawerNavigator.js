import React, { useContext } from "react";
import { StyleSheet, Alert, SafeAreaView } from "react-native";
import {
  createDrawerNavigator,
  DrawerContentScrollView,
  DrawerItemList,
  DrawerItem,
} from "@react-navigation/drawer";
import { NavigationContainer } from "@react-navigation/native";
import LoginScreen from "../screens/LoginScreen";
import FlightStackNavigator from "./FlightStackNavigator";
import AppContext from "../components/AppContext";

function DrawerNavigator({ navigation }) {
  const Context = useContext(AppContext);

  const Drawer = createDrawerNavigator();

  function CustomDrawerContent(props) {
    return (
      <DrawerContentScrollView {...props}>
        <DrawerItemList {...props} />
        <DrawerItem
          label='Logout'
          onPress={() => {
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
          drawerContent={(props) => <CustomDrawerContent {...props} />}
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
