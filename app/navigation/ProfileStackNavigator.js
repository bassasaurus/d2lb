import SignatureScreen from '../signature/SignatureScreen';
import React from 'react';
import { createStackNavigator } from '@react-navigation/stack';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import ProfileScreen from '../profile/ProfileScreen';
import ProfileEditScreen from '../profile/ProfileEditScreen';
import { useAppTheme } from '../theme/ThemeProvider';
const Stack = createStackNavigator();
export default function ProfileStackNavigator({ navigation }) {
  const { colors } = useAppTheme();
  return <Stack.Navigator screenOptions={{ cardStyle: { backgroundColor: colors.background } }}>
    <Stack.Screen name="ProfileOverview" component={ProfileScreen} options={{ title: 'Profile', headerLeft: () => <MaterialCommunityIcons name="menu-open" size={30} color={colors.text} style={{ paddingLeft: 8 }} onPress={() => navigation.openDrawer()} /> }} />
    <Stack.Screen name="SignatureEdit" component={SignatureScreen} options={{ headerShown: false, gestureEnabled: false }} />
    <Stack.Screen name="ProfileEdit" component={ProfileEditScreen} options={({ route }) => ({ title: route.params.section === 'medical' ? 'Update medical info' : 'Update account' })} />
  </Stack.Navigator>;
}
