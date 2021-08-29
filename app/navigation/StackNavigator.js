import React from "react";
import { createStackNavigator } from "@react-navigation/stack";
import FlightListScreen from "../screens/FlightListScreen";
import FlightDetailScreen from "../screens/FlightDetailScreen";
import FlightCreateScreen from "../screens/FlightCreateScreen";

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
        name='FlightList'
        component={FlightListScreen}
        options={{
          title: "Flights",
          cardStyleInterpolator: forFade,
        }}
      />

      <Stack.Screen
        name='FlightDetail'
        component={FlightDetailScreen}
        options={{
          title: "Detail",
          cardStyleInterpolator: forFade,
        }}
      />
      {(props) => <DetailScreen {...props} id={id} />}

      <Stack.Screen
        name='FlightCreate'
        component={FlightCreateScreen}
        options={{
          title: "New Flight",
          cardStyleInterpolator: forFade,
        }}
      />
    </Stack.Navigator>
  );
}

export default StackNavigator;
