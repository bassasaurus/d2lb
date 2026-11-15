import NavigationMenuButton from '../components/NavigationMenuButton';
import SignatureScreen from '../signature/SignatureScreen';
import React from 'react';
import { createStackNavigator } from '@react-navigation/stack';
import ProfileScreen from '../profile/ProfileScreen';
import ProfileEditScreen from '../profile/ProfileEditScreen';
import { useAppTheme } from '../theme/ThemeProvider';
const Stack = createStackNavigator();
export default function ProfileStackNavigator() {
  const { colors } = useAppTheme();
  return <Stack.Navigator screenOptions={{ headerLeft: () => <NavigationMenuButton mainPage={{ route: 'ProfileOverview', label: 'Profile' }} />, cardStyle: { backgroundColor: colors.background } }}>
    <Stack.Screen name="ProfileOverview" component={ProfileScreen} options={{ title: 'Profile', headerLeft: () => <NavigationMenuButton /> }} />
    <Stack.Screen name="SignatureEdit" component={SignatureScreen} options={{ headerShown: false, gestureEnabled: false }} />
    <Stack.Screen name="ProfileEdit" component={ProfileEditScreen} options={({ route }) => ({ title: route.params.section === 'medical' ? 'Update medical info' : 'Update account' })} />
  </Stack.Navigator>;
}
