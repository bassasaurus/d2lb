import React from "react";
import { createStackNavigator } from "@react-navigation/stack";
import FlightListScreen from "../screens/FlightListScreen";
import DetailScreen from "../screens/DetailScreen";

function StackNavigator(props) {
  const Stack = createStackNavigator();

  const forFade = ({ current }) => ({
  cardStyle: {
    opacity: current.progress,
  },
  });
  
  return (
    <Stack.Navigator>
      <Stack.Screen
        name='Flights'
        component={FlightListScreen}
        options={{ title: "Flights" }}
        options={{ cardStyleInterpolator: forFade }}
      />

      <Stack.Screen
        name='Detail'
        component={DetailScreen}
        options={{ title: "Detail" }}
        options={{ cardStyleInterpolator: forFade }}
      />
      {(props) => <DetailScreen {...props} id={id} />}
    </Stack.Navigator>
  );
}

export default StackNavigator;
