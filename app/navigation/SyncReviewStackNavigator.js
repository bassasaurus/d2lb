import { useAppTheme } from '../theme/ThemeProvider';
import React from 'react';
import { createStackNavigator } from '@react-navigation/stack';
import { Button } from 'react-native';
import SyncConflictScreen from '../sync/SyncConflictScreen';
const Stack = createStackNavigator();
export default function SyncReviewStackNavigator({ navigation }) {
  const { colors, navigationTheme } = useAppTheme();
  return <Stack.Navigator screenOptions={{ cardStyle: { backgroundColor: colors.background } }}>
    <Stack.Screen name="SyncConflict" component={SyncConflictScreen} options={{ title: 'Review record', headerLeft: () => <Button title="Close" color={colors.primary} onPress={() => navigation.goBack()} /> }} />
  </Stack.Navigator>;
}
