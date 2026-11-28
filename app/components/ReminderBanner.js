import React from 'react';
import Card from './Card';
import { useAppTheme } from '../theme/ThemeProvider';
import { reminderTone } from '../settings/reminderPresentation.mjs';

export default function ReminderBanner({ severity, milestoneState, plain = false, compact = false, style, children, ...props }) {
  const { colors, isDark } = useAppTheme();
  const tone = reminderTone(severity, isDark, colors, plain, milestoneState);
  return <Card {...props} compact style={[{ backgroundColor: tone.background,
    borderColor: tone.border && tone.border !== 'transparent' ? tone.border : colors.border,
    ...(compact ? { paddingVertical: 5 } : {}) }, style]}>{children}</Card>;
}
