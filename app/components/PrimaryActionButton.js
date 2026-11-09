import React from 'react';
import { Platform, Pressable, StyleSheet, Text } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useAppTheme } from '../theme/ThemeProvider';

export default function PrimaryActionButton({ title, onPress, icon, disabled = false, testID }) {
  const { colors } = useAppTheme();
  return <Pressable testID={testID} accessibilityRole="button" accessibilityLabel={title}
    accessibilityState={{ disabled }} disabled={disabled} onPress={onPress}
    android_ripple={{ color: '#ffffff30' }}
    style={({ pressed }) => [styles.button, {
      backgroundColor: colors.actionGreen,
      opacity: disabled ? 0.45 : pressed && Platform.OS === 'ios' ? 0.75 : 1,
    }]}>
    {icon && <MaterialCommunityIcons name={icon} size={22} color={colors.onAction} />}
    <Text style={[styles.label, { color: colors.onAction }]}>{title}</Text>
  </Pressable>;
}

const styles = StyleSheet.create({
  button: {
    minHeight: 48, paddingHorizontal: 16, paddingVertical: 12,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    borderRadius: Platform.OS === 'android' ? 24 : 10, overflow: 'hidden',
  },
  label: { fontSize: 17, fontWeight: '600', textAlign: 'center' },
});
