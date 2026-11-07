import { useAppTheme } from '../theme/ThemeProvider';
import React from 'react';
import { createStackNavigator } from '@react-navigation/stack';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import AircraftListScreen from '../aircraft/AircraftListScreen';
import AircraftDetailScreen from '../aircraft/AircraftDetailScreen';
import AircraftFormScreen from '../aircraft/AircraftFormScreen';
import TailnumberCreateScreen from '../Screens/TailnumberCreateScreen';
import TailnumberDetailScreen from '../Screens/TailnumberDetailScreen';
import TailnumberUpdateScreen from '../Screens/TailnumberUpdateScreen';

const Stack = createStackNavigator();
export default function AircraftStackNavigator({ navigation }) {
  const { colors, navigationTheme } = useAppTheme();
  return <Stack.Navigator screenOptions={{ cardStyle: { backgroundColor: colors.background } }}>
    <Stack.Screen name="AircraftList" component={AircraftListScreen} options={{ title: 'Aircraft', headerLeft: () => <MaterialCommunityIcons name="menu-open" size={30} color={colors.text} style={{ paddingLeft: 8 }} onPress={() => navigation.openDrawer()} /> }} />
    <Stack.Screen name="AircraftDetail" component={AircraftDetailScreen} options={{ title: 'Aircraft details' }} />
    <Stack.Screen name="AircraftForm" component={AircraftFormScreen} options={({ route }) => ({ title: route.params?.item ? 'Update aircraft' : 'New aircraft' })} />
    <Stack.Screen name="AircraftTailnumberCreate" component={TailnumberCreateScreen} options={{ title: "New tailnumber" }} />
    <Stack.Screen name="TailnumberDetail" component={TailnumberDetailScreen} options={{ title: "Tailnumber details" }} />
    <Stack.Screen name="TailnumberUpdate" component={TailnumberUpdateScreen} options={{ title: "Update tailnumber" }} />
  </Stack.Navigator>;
}
