import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Alert, Animated, View } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import AppText from './AppText';
import Card from './Card';
import PlatformActionButton from './PlatformActionButton';
import { useAppTheme } from '../theme/ThemeProvider';

export default function ReminderFeedback({ feedback, onClose }) {
  const { colors } = useAppTheme();
  const [busy, setBusy] = useState(false);
  const opacity = useRef(new Animated.Value(1)).current;
  useFocusEffect(useCallback(() => () => onClose(null), [onClose]));
  useEffect(() => {
    if (!feedback) return;
    opacity.setValue(1);
    const animation = Animated.timing(opacity, { toValue: 0, duration: 200, useNativeDriver: true });
    const timer = setTimeout(() => animation.start(({ finished }) => { if (finished) onClose(null); }), feedback.durationMs ?? 3000);
    return () => { clearTimeout(timer); animation.stop(); };
  }, [feedback, onClose, opacity]);
  if (!feedback) return null;
  async function undo() {
    if (busy) return;
    setBusy(true);
    try { await feedback.undo(); onClose(null); }
    catch { Alert.alert('Could not undo', 'Please try again or restore the alert from Manage.'); }
    finally { setBusy(false); }
  }
  return <View pointerEvents="box-none" style={{ position: 'absolute', bottom: 76, left: 12, right: 12, zIndex: 20, elevation: 8 }}>
    <Animated.View style={{ opacity }}>
    <Card style={{ borderWidth: 1, borderColor: colors.border, flexDirection: 'row', alignItems: 'center', gap: 8 }} testID="reminder-feedback">
      <AppText style={{ flex: 1 }} accessibilityLiveRegion="polite">{feedback.message}</AppText>
      <PlatformActionButton title="Undo" variant="text" disabled={busy} onPress={undo} />
    </Card>
    </Animated.View>
  </View>;
}
