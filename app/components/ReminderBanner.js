import React from 'react';
import { View } from 'react-native';
import { useAppTheme } from '../theme/ThemeProvider';
import { reminderTone } from '../settings/reminderPresentation.mjs';

export default function ReminderBanner({ severity, milestoneState, plain = false, compact = false, style, children, ...props }) {
  const { colors, isDark } = useAppTheme();
  const tone = reminderTone(severity, isDark, colors, plain, milestoneState);
  return <View {...props} style={[{ backgroundColor: tone.background, borderColor: tone.border,
    borderWidth: 1, borderRadius: 10, paddingHorizontal: 12, paddingVertical: compact ? 5 : 6 }, style]}>{children}</View>;
}
