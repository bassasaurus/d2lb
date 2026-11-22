import React, { useCallback, useEffect, useState } from 'react';
import { Alert, View } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import AppText from './AppText';
import Card from './Card';
import PlatformActionButton from './PlatformActionButton';
import { useAppTheme } from '../theme/ThemeProvider';

export default function ReminderFeedback({ feedback, onClose }) {
  const { colors } = useAppTheme();
  const [busy, setBusy] = useState(false);
  useFocusEffect(useCallback(() => () => onClose(null), [onClose]));
  useEffect(() => {
    if (!feedback) return;
    const timer = setTimeout(() => onClose(null), 10000);
    return () => clearTimeout(timer);
  }, [feedback, onClose]);
  if (!feedback) return null;
  async function undo() {
    if (busy) return;
    setBusy(true);
    try { await feedback.undo(); onClose(null); }
    catch { Alert.alert('Could not undo', 'Please try again or restore the alert from Manage.'); }
    finally { setBusy(false); }
  }
  return <View pointerEvents="box-none" style={{ position: 'absolute', bottom: 76, left: 12, right: 12, zIndex: 20, elevation: 8 }}>
    <Card style={{ borderWidth: 1, borderColor: colors.border, flexDirection: 'row', alignItems: 'center', gap: 8 }} testID="reminder-feedback">
      <AppText style={{ flex: 1 }} accessibilityLiveRegion="polite">{feedback.message}</AppText>
      <PlatformActionButton title="Undo" variant="text" disabled={busy} onPress={undo} />
    </Card>
  </View>;
}
