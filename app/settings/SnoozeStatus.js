import React, { useState } from 'react';
import { Alert, View } from 'react-native';
import Text from '../components/AppText';
import PlatformActionButton from '../components/PlatformActionButton';
import { useAppTheme } from '../theme/ThemeProvider';

export function ShowNowAction({ reminder, snoozes, style }) {
  const [saving, setSaving] = useState(false);
  if (!snoozes.until(reminder) && !snoozes.dismissed(reminder)) return null;
  async function showNow() {
    if (saving) return;
    setSaving(true);
    try { await snoozes.showNow(reminder); }
    catch { Alert.alert('Could not show reminder', 'Please try again.'); }
    finally { setSaving(false); }
  }
  return <PlatformActionButton title="Show Now" variant="text" style={[{ paddingLeft: 0, justifyContent: 'flex-start' }, style]} disabled={saving || !snoozes.ready}
    accessibilityLabel={`Show ${reminder.title || 'reminder'} now`} onPress={showNow} />;
}

export default function SnoozeStatus({ reminder, snoozes, showAction = true }) {
  const { colors } = useAppTheme();
  const until = snoozes.until(reminder);
  const dismissed = snoozes.dismissed(reminder);
  if (!until && !dismissed) return null;
  return <View style={{ paddingTop: 2, alignItems: 'flex-start' }}>
    <Text color={colors.muted}>{dismissed ? 'Dismissed until this reminder turns red' : `Snoozed until ${new Date(until).toLocaleString(undefined, {
      month: 'short', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit',
    })}`}</Text>
    {showAction && <ShowNowAction reminder={reminder} snoozes={snoozes} />}
  </View>;
}
