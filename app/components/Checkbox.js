import React from 'react';
import { View, Pressable } from 'react-native';
import AppText from './AppText';
import { useAppTheme } from '../theme/ThemeProvider';

export default function Checkbox({ onPress, isChecked, label, disabled = false }) {
  const { colors } = useAppTheme();
  return <Pressable onPress={onPress} disabled={disabled} accessibilityRole="checkbox"
    accessibilityState={{ checked: Boolean(isChecked), disabled }} accessibilityLabel={label}
    style={{ opacity: disabled ? 0.45 : 1, flexDirection: 'row', alignItems: 'center', gap: 6, minHeight: label ? 44 : undefined }}>
    <View style={{ height: 20, width: 20, flexShrink: 0,
      backgroundColor: isChecked ? colors.primary : colors.surface,
      borderColor: colors.border, borderWidth: 1, borderRadius: 5 }} />
    {label && <AppText numberOfLines={1} style={{ flexShrink: 1 }}>{label}</AppText>}
  </Pressable>;
}
