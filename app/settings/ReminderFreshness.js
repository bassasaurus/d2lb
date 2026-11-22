import React from 'react';
import Text from '../components/AppText';
import { useAppTheme } from '../theme/ThemeProvider';

export default function ReminderFreshness({ state }) {
  const { colors } = useAppTheme();
  if (!state.offline && !state.cached) return null;
  return <Text color={colors.muted} style={{ paddingVertical: 4 }} accessibilityLiveRegion="polite">
    {state.updatedAt ? `Showing saved reminders. Last updated ${new Date(state.updatedAt).toLocaleString()}. Dates and status may have changed.`
      : 'Reminders unavailable. Connect to download them.'}
  </Text>;
}
