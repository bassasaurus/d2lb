import React from "react";
import { createStackNavigator } from "@react-navigation/stack";
import FlightListScreen from "../screens/FlightListScreen";
import DetailScreen from "../screens/DetailScreen";

function StackNavigator(props) {
  const Stack = createStackNavigator();
  return (
    <Stack.Navigator>
      <Stack.Screen
        name='Flights'
        component={FlightListScreen}
        options={{ title: "Flights" }}
      />

      <Stack.Screen
        name='Detail'
        component={DetailScreen}
        options={{ title: "Detail" }}
      />
      {(props) => <DetailScreen {...props} id={id} />}
    </Stack.Navigator>
  );
}

export default StackNavigator;
