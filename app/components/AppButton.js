import React from 'react';
import { Platform, Pressable, StyleSheet, Text } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useAppTheme } from '../theme/ThemeProvider';

export default function AppButton({
  title, onPress, accessibilityLabel, variant = 'filled', tone = 'default',
  icon, disabled = false, testID,
}) {
  const { colors } = useAppTheme();
  const accent = tone === 'danger' ? colors.danger : colors.primary;
  const filled = variant === 'filled';
  const fill = tone === 'positive' ? colors.actionGreen : tone === 'danger' ? colors.actionDanger : colors.actionBlue;
  const labelColor = filled ? colors.onAction : accent;

  return <Pressable testID={testID} accessibilityRole="button" accessibilityLabel={accessibilityLabel || title}
    accessibilityState={{ disabled }} disabled={disabled} onPress={onPress}
    android_ripple={{ color: `${labelColor}30` }}
    style={({ pressed }) => [styles.button, {
      backgroundColor: filled ? fill : 'transparent',
      borderWidth: variant === 'outlined' ? 1 : 0,
      borderColor: colors.border,
      opacity: disabled ? 0.45 : pressed && Platform.OS !== 'android' ? 0.75 : 1,
    }]}>
    {icon && <MaterialCommunityIcons name={icon} size={22} color={labelColor} accessible={false} />}
    <Text style={[styles.label, { color: labelColor }]}>{title}</Text>
  </Pressable>;
}

const styles = StyleSheet.create({
  button: {
    minHeight: 48, paddingHorizontal: 16, paddingVertical: 10,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    borderRadius: Platform.OS === 'android' ? 24 : 10, overflow: 'hidden',
  },
  label: { fontSize: 17, fontWeight: '600', textAlign: 'center', flexShrink: 1 },
});
