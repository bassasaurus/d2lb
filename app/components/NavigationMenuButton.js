import React from 'react';
import { Pressable } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { useAppTheme } from '../theme/ThemeProvider';

export default function NavigationMenuButton({ mainPage, testID = 'navigation-menu' }) {
  const navigation = useNavigation();
  const { colors } = useAppTheme();
  return <Pressable testID={testID} accessibilityRole="button"
    accessibilityLabel={mainPage ? `Back to ${mainPage.label}` : 'Open navigation menu'}
    onPress={() => mainPage ? navigation.popTo(mainPage.route) : navigation.openDrawer()}
    hitSlop={8} style={{ width: 48, height: 44, alignItems: 'center', justifyContent: 'center' }}>
    <MaterialCommunityIcons name={mainPage ? 'arrow-left' : 'menu-open'} size={30} color={colors.text} />
  </Pressable>;
}
