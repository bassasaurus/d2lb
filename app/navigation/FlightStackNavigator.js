import React from "react";
import { createStackNavigator } from "@react-navigation/stack";
import FlightListScreen from "../screens/FlightListScreen";
import FlightDetailScreen from "../screens/FlightDetailScreen";
import FlightCreateScreen from "../screens/FlightCreateScreen";
import FlightUpdateScreen from "../screens/FlightUpdateScreen";
import { Button, Text } from "react-native";
import { useNavigation } from "@react-navigation/native";

function FlightStackNavigator(props) {
  const Stack = createStackNavigator();

  const navigation = useNavigation();

  const forFade = ({ current }) => ({
    cardStyle: {
      opacity: current.progress,
    },
  });

  return (
    <Stack.Navigator>
      <Stack.Screen
        name='FlightList'
        component={FlightListScreen}
        options={{
          title: "Logbook",
          cardStyleInterpolator: forFade,
          cardStyle: { backgroundColor: "white" },
          headerShown: true,
          headerLeft: () => (
            <Button title='click' onPress={() => navigation.openDrawer()} />
          ),
        }}
      />

      <Stack.Screen
        name='FlightDetail'
        component={FlightDetailScreen}
        options={{
          title: "Detail",
          cardStyleInterpolator: forFade,
          cardStyle: { backgroundColor: "white" },
        }}
      />
      {(props) => <DetailScreen {...props} id={id} />}

      <Stack.Screen
        name='FlightCreate'
        component={FlightCreateScreen}
        options={{
          title: "New Flight",
          cardStyleInterpolator: forFade,
          cardStyle: { backgroundColor: "white" },
        }}
      />

      <Stack.Screen
        name='FlightUpdate'
        component={FlightUpdateScreen}
        options={{
          title: "Update",
          cardStyleInterpolator: forFade,
          cardStyle: { backgroundColor: "white" },
        }}
      />
    </Stack.Navigator>
  );
}

export default FlightStackNavigator;
