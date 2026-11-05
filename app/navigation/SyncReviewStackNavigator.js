import React from 'react';
import { createStackNavigator } from '@react-navigation/stack';
import { Button } from 'react-native';
import SyncReviewListScreen from '../sync/SyncReviewListScreen';
import SyncConflictScreen from '../sync/SyncConflictScreen';
const Stack = createStackNavigator();
export default function SyncReviewStackNavigator({ navigation }) {
  return <Stack.Navigator screenOptions={{ cardStyle: { backgroundColor: 'white' } }}>
    <Stack.Screen name="SyncReviewList" component={SyncReviewListScreen} options={{ title: 'Resolve sync issues', headerLeft: () => <Button title="Close" onPress={() => navigation.goBack()} /> }} />
    <Stack.Screen name="SyncConflict" component={SyncConflictScreen} options={{ title: 'Review changes' }} />
  </Stack.Navigator>;
}
