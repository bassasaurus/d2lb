import React from "react";
import { createStackNavigator } from "@react-navigation/stack";
import FlightListScreen from "../screens/FlightListScreen";
import FlightDetailScreen from "../screens/FlightDetailScreen";
import FlightCreateScreen from "../screens/FlightCreateScreen";
import FlightUpdateScreen from "../screens/FlightUpdateScreen";
import { Button, Pressable, Text } from "react-native";
import { useNavigation } from "@react-navigation/native";

import { MaterialCommunityIcons } from "@expo/vector-icons";
import TailnumberCreateScreen from "../screens/TailnumberCreateScreen";

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
            <MaterialCommunityIcons
              style={{ paddingLeft: 5 }}
              name='menu-open'
              size={30}
              onPress={() => navigation.openDrawer()}
            />
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

      <Stack.Screen
        name='TailnumberCreate'
        component={TailnumberCreateScreen}
        options={{
          title: "Create",
          cardStyleInterpolator: forFade,
          cardStyle: { backgroundColor: "white" },
        }}
      />
    </Stack.Navigator>
  );
}

export default FlightStackNavigator;
