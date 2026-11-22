import { formatDate } from '../formatting/dates.mjs';
import React, { useState } from 'react';
import { Alert, View } from 'react-native';
import Text from '../components/AppText';
import PlatformActionButton from '../components/PlatformActionButton';
import { useAppTheme } from '../theme/ThemeProvider';

export function ShowNowAction({ reminder, snoozes, style }) {
  const [saving, setSaving] = useState(false);
  if (reminder?.medical || (!snoozes.until(reminder) && !snoozes.dismissed(reminder))) return null;
  async function showNow() {
    if (saving) return;
    setSaving(true);
    try { await snoozes.showNow(reminder); }
    catch { Alert.alert('Could not show reminder', 'Please try again.'); }
    finally { setSaving(false); }
  }
  return <PlatformActionButton title="Restore" variant="text" style={[{ paddingLeft: 0, justifyContent: 'flex-start' }, style]} disabled={saving || !snoozes.ready}
    accessibilityLabel={`Restore ${reminder.title || 'reminder'}`} onPress={showNow} />;
}

export default function SnoozeStatus({ reminder, snoozes, showAction = true }) {
  const { colors } = useAppTheme();
  const until = snoozes.until(reminder);
  const dismissed = snoozes.dismissed(reminder);
  if (!until && !dismissed) return null;
  return <View style={{ paddingTop: 2, alignItems: 'flex-start' }}>
    <Text color={colors.muted}>{dismissed ? 'Hidden until red' : `Hidden until ${formatDate(new Date(until).toISOString().slice(0, 10))}`}</Text>
    {showAction && <ShowNowAction reminder={reminder} snoozes={snoozes} />}
  </View>;
}
