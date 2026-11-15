import NavigationMenuButton from '../components/NavigationMenuButton';
import { useAppTheme } from '../theme/ThemeProvider';
import React from "react";
import { createStackNavigator } from "@react-navigation/stack";
import FlightListScreen from "../Screens/FlightListScreen";
import FlightDetailScreen from "../Screens/FlightDetailScreen";
import FlightCreateScreen from "../Screens/FlightCreateScreen";
import FlightUpdateScreen from "../Screens/FlightUpdateScreen";
import ProfileEditScreen from '../profile/ProfileEditScreen';

import TailnumberCreateScreen from "../Screens/TailnumberCreateScreen";


const Stack = createStackNavigator();

function FlightStackNavigator() {
  const { colors } = useAppTheme();


  const forFade = ({ current }) => ({
    cardStyle: {
      opacity: current.progress,
    },
  });

  return (
    <Stack.Navigator screenOptions={{ headerLeft: () => <NavigationMenuButton mainPage={{ route: 'FlightList', label: 'Logbook' }} /> }}>
      <Stack.Screen
        name='FlightList'
        component={FlightListScreen}
        options={{
          title: "Logbook",
          cardStyleInterpolator: forFade,
          cardStyle: { backgroundColor: colors.background },
          headerShown: true,
          headerLeft: () => <NavigationMenuButton testID="logbook-menu" />,
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
        name="MedicalEdit"
        component={ProfileEditScreen}
        options={{ title: 'Update Medical', cardStyle: { backgroundColor: colors.background } }}
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
