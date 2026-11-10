import PlatformActionButton from '../components/PlatformActionButton';
import React from 'react';
import { createStackNavigator } from '@react-navigation/stack';
import { useAppTheme } from '../theme/ThemeProvider';

import SyncConflictScreen from '../sync/SyncConflictScreen';
import SyncReviewListScreen from '../sync/SyncReviewListScreen';
const Stack = createStackNavigator();
export default function SyncReviewStackNavigator({ navigation }) {
  const { colors } = useAppTheme();
  return <Stack.Navigator screenOptions={{ cardStyle: { backgroundColor: colors.background } }}>
    <Stack.Screen name="SyncConflict" component={SyncConflictScreen} options={{ title: 'Review record', headerLeft: () => <PlatformActionButton variant="text" title="Close" onPress={() => navigation.goBack()} /> }} />
    <Stack.Screen name="SyncReviewList" component={SyncReviewListScreen} options={{ title: 'Sync issues', headerLeft: () => <PlatformActionButton variant="text" title="Close" onPress={() => navigation.goBack()} /> }} />
  </Stack.Navigator>;
}
