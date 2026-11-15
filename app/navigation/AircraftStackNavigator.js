import NavigationMenuButton from '../components/NavigationMenuButton';
import { useAppTheme } from '../theme/ThemeProvider';
import React from 'react';
import { createStackNavigator } from '@react-navigation/stack';
import AircraftListScreen from '../aircraft/AircraftListScreen';
import AircraftDetailScreen from '../aircraft/AircraftDetailScreen';
import AircraftFormScreen from '../aircraft/AircraftFormScreen';
import TailnumberCreateScreen from '../Screens/TailnumberCreateScreen';
import TailnumberDetailScreen from '../Screens/TailnumberDetailScreen';
import TailnumberUpdateScreen from '../Screens/TailnumberUpdateScreen';

const Stack = createStackNavigator();
export default function AircraftStackNavigator() {
  const { colors } = useAppTheme();
  return <Stack.Navigator screenOptions={{ headerLeft: () => <NavigationMenuButton mainPage={{ route: 'AircraftList', label: 'Aircraft' }} />, cardStyle: { backgroundColor: colors.background } }}>
    <Stack.Screen name="AircraftList" component={AircraftListScreen} options={{ title: 'Aircraft', headerLeft: () => <NavigationMenuButton /> }} />
    <Stack.Screen name="AircraftDetail" component={AircraftDetailScreen} options={{ title: 'Aircraft details' }} />
    <Stack.Screen name="AircraftForm" component={AircraftFormScreen} options={({ route }) => ({ title: route.params?.item ? 'Update aircraft' : 'New Aircraft' })} />
    <Stack.Screen name="AircraftTailnumberCreate" component={TailnumberCreateScreen} options={{ title: "New Tailnumber" }} />
    <Stack.Screen name="TailnumberDetail" component={TailnumberDetailScreen} options={{ title: "Tailnumber details" }} />
    <Stack.Screen name="TailnumberUpdate" component={TailnumberUpdateScreen} options={{ title: "Update Tailnumber" }} />
  </Stack.Navigator>;
}
