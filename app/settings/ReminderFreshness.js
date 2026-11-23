import { formatDateTime } from '../formatting/dates.mjs';
import React from 'react';
import Text from '../components/AppText';
import { useAppTheme } from '../theme/ThemeProvider';

export default function ReminderFreshness({ state, showCached = true }) {
  const { colors } = useAppTheme();
  if ((!state.offline && !state.cached) || (!showCached && state.updatedAt)) return null;
  return <Text color={colors.muted} style={{ paddingVertical: 4 }} accessibilityLiveRegion="polite">
    {state.updatedAt ? `Showing saved reminders. Last updated ${formatDateTime(state.updatedAt)}. Dates and status may have changed.`
      : 'Reminders unavailable. Connect to download them.'}
  </Text>;
}
