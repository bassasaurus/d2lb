import { useAppTheme } from '../theme/ThemeProvider';
import React, { useEffect } from 'react';
import { AppState } from 'react-native';
import NetInfo from '@react-native-community/netinfo';
import syncFlightData from '../api/syncFlightData';
import { flightStore, flightScope } from '../storage/flights';
import { aircraftScope } from '../storage/aircraft';
import { createStackNavigator } from '@react-navigation/stack';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import AircraftListScreen from '../aircraft/AircraftListScreen';
import AircraftDetailScreen from '../aircraft/AircraftDetailScreen';
import AircraftFormScreen from '../aircraft/AircraftFormScreen';
import TailnumberCreateScreen from '../Screens/TailnumberCreateScreen';
import TailnumberUpdateScreen from '../Screens/TailnumberUpdateScreen';

const Stack = createStackNavigator();
export default function AircraftStackNavigator({ navigation }) {
  const { colors, navigationTheme } = useAppTheme();
  useEffect(() => {
    const sync = () => syncFlightData().catch(() => {});
    const foreground = AppState.addEventListener('change', state => { if (state === 'active') sync(); });
    let connected;
    const unsubscribe = NetInfo.addEventListener(state => {
      if (state.isConnected && connected === false) sync();
      connected = state.isConnected;
    });
    const timer = setInterval(async () => {
      if (AppState.currentState !== 'active') return;
      try {
        if (await (await flightStore()).pendingCount(aircraftScope(await flightScope()))) sync();
      } catch (error) { /* Lists retain local data and display sync errors. */ }
    }, 30000);
    return () => { foreground.remove(); unsubscribe(); clearInterval(timer); };
  }, []);
  return <Stack.Navigator screenOptions={{ cardStyle: { backgroundColor: colors.surface } }}>
    <Stack.Screen name="AircraftList" component={AircraftListScreen} options={{ title: 'Aircraft', headerLeft: () => <MaterialCommunityIcons name="menu-open" size={30} color={colors.text} style={{ paddingLeft: 8 }} onPress={() => navigation.openDrawer()} /> }} />
    <Stack.Screen name="AircraftDetail" component={AircraftDetailScreen} options={{ title: 'Aircraft details' }} />
    <Stack.Screen name="AircraftForm" component={AircraftFormScreen} options={({ route }) => ({ title: route.params?.item ? 'Update aircraft' : 'New aircraft' })} />
    <Stack.Screen name="AircraftTailnumberCreate" component={TailnumberCreateScreen} options={{ title: "New tailnumber" }} />
    <Stack.Screen name="TailnumberUpdate" component={TailnumberUpdateScreen} options={{ title: "Update tailnumber" }} />
  </Stack.Navigator>;
}
