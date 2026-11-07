import React from 'react';
import { View, Pressable } from 'react-native';
import AppText from './AppText';
import { useAppTheme } from '../theme/ThemeProvider';

export default function Checkbox({ onPress, isChecked, label }) {
  const { colors } = useAppTheme();
  return <Pressable onPress={onPress} accessibilityRole="checkbox"
    accessibilityState={{ checked: Boolean(isChecked) }} accessibilityLabel={label}
    style={{ flexDirection: 'row', alignItems: 'center', gap: 6, minHeight: label ? 44 : undefined }}>
    <View style={{ height: 20, width: 20, flexShrink: 0,
      backgroundColor: isChecked ? colors.primary : colors.surface,
      borderColor: colors.border, borderWidth: 1, borderRadius: 5 }} />
    {label && <AppText numberOfLines={1} style={{ flexShrink: 1 }}>{label}</AppText>}
  </Pressable>;
}
