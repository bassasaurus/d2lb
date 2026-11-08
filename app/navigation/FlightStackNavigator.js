import { useAppTheme } from '../theme/ThemeProvider';
import React from "react";
import { createStackNavigator } from "@react-navigation/stack";
import FlightListScreen from "../Screens/FlightListScreen";
import FlightDetailScreen from "../Screens/FlightDetailScreen";
import FlightCreateScreen from "../Screens/FlightCreateScreen";
import FlightUpdateScreen from "../Screens/FlightUpdateScreen";
import { Button, Pressable } from 'react-native';
import Text from '../components/AppText';
import { useNavigation } from "@react-navigation/native";

import { MaterialCommunityIcons } from "@expo/vector-icons";
import TailnumberCreateScreen from "../Screens/TailnumberCreateScreen";


const Stack = createStackNavigator();

function FlightStackNavigator(props) {
  const { colors, navigationTheme } = useAppTheme();

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
          cardStyle: { backgroundColor: colors.background },
          headerShown: true,
          headerLeft: () => (
            <MaterialCommunityIcons
              style={{ paddingLeft: 5 }}
              name='menu-open'
              accessibilityRole="button"
              accessibilityLabel="Open navigation menu"
              testID="logbook-menu"
              size={30} color={colors.text}
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
          headerBackTestID: "flight-detail-back",
          cardStyleInterpolator: forFade,
          cardStyle: { backgroundColor: colors.background },
        }}
      />

      <Stack.Screen
        name='FlightCreate'
        component={FlightCreateScreen}
        options={{
          title: "New Flight",
          cardStyleInterpolator: forFade,
          cardStyle: { backgroundColor: colors.background },
        }}
      />

      <Stack.Screen
        name='FlightUpdate'
        component={FlightUpdateScreen}
        options={{
          title: "Update",
          cardStyleInterpolator: forFade,
          cardStyle: { backgroundColor: colors.background },
        }}
      />

      <Stack.Screen
        name='TailnumberCreate'
        component={TailnumberCreateScreen}
        options={{
          title: "New Tailnumber",
          cardStyleInterpolator: forFade,
          cardStyle: { backgroundColor: colors.background },
        }}
      />
    </Stack.Navigator>
  );
}

export default FlightStackNavigator;
