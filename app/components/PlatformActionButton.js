import React from 'react';
import { Button, Platform, Pressable, StyleSheet, Text } from 'react-native';
import { useAppTheme } from '../theme/ThemeProvider';

// Preserve the native iOS control; give Android actions Material-style emphasis.
export default function PlatformActionButton({ title, onPress, accessibilityLabel, variant = 'filled', destructive = false, disabled = false }) {
  const { colors } = useAppTheme();
  const accent = destructive ? colors.danger : colors.primary;
  if (Platform.OS !== 'android') return <Button title={title} onPress={onPress}
    accessibilityLabel={accessibilityLabel} color={accent} disabled={disabled} />;
  const filled = variant === 'filled';
  return <Pressable accessibilityRole="button" accessibilityLabel={accessibilityLabel || title}
    accessibilityState={{ disabled }} disabled={disabled} onPress={onPress}
    android_ripple={{ color: `${accent}24` }}
    style={[styles.button, { opacity: disabled ? 0.4 : 1,
      backgroundColor: filled ? colors.actionBlue : 'transparent',
      borderWidth: variant === 'outlined' ? 1 : 0, borderColor: colors.border }]}>
    <Text style={[styles.label, { color: filled ? colors.onAction : accent }]}>{title}</Text>
  </Pressable>;
}
const styles = StyleSheet.create({
  button: { minHeight: 48, paddingHorizontal: 24, paddingVertical: 10, borderRadius: 24,
    alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
  label: { fontSize: 17, fontWeight: '500', textAlign: 'center', letterSpacing: 0.1 },
});
