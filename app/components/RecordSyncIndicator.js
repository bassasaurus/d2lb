import React, { useEffect, useRef, useState } from 'react';
import { Animated, View } from 'react-native';
import { recordSyncFeedback } from '../api/flightSyncFeedback.mjs';
import { useAppTheme } from '../theme/ThemeProvider';

export default function RecordSyncIndicator({ item, scope, syncEvent }) {
  const { colors } = useAppTheme();
  const synced = (item.sync_state ?? 'synced') === 'synced';
  const failed = Boolean(item.sync_error || item.needs_attention);
  const [recordEvent, setRecordEvent] = useState(null);
  const event = scope ? recordEvent : syncEvent;
  const previous = useRef(synced);
  const lastEvent = useRef(null);
  const progress = useRef(new Animated.Value(0)).current;
  const opacity = useRef(new Animated.Value(0)).current;
  const [width, setWidth] = useState(0);
  const [playing, setPlaying] = useState(false);
  useEffect(() => {
    if (!scope || !synced) return;
    const row = { ...item, local_id: item.local_id ?? `server:${item.id}`, sync_state: 'synced' };
    if (recordSyncFeedback.take(scope, [row]).length) setRecordEvent(Date.now());
  }, [item, scope, synced]);
  useEffect(() => {
    if (!width) return;
    const confirmedEvent = event && event !== lastEvent.current && Date.now() - event < 5000;
    const completed = synced && (confirmedEvent || (!scope && !previous.current));
    lastEvent.current = event;
    previous.current = synced;
    if (!completed) {
      opacity.setValue(0);
      setPlaying(false);
      return;
    }
    progress.setValue(0);
    opacity.setValue(1);
    setPlaying(true);
    const animation = Animated.sequence([
      Animated.timing(progress, { toValue: 1, duration: 500, useNativeDriver: true }),
      Animated.delay(100),
      Animated.timing(opacity, { toValue: 0, duration: 150, useNativeDriver: true }),
    ]);
    animation.start(({ finished }) => { if (finished) setPlaying(false); });
    return () => animation.stop();
  }, [synced, event, scope, width, progress, opacity]);
  const label = synced ? 'Synced' : failed ? 'Sync failed' : 'Pending sync';
  const dotColor = synced ? colors.success : failed ? colors.danger : colors.syncPending;
  return <View accessible accessibilityLabel={label}
    onLayout={event => setWidth(event.nativeEvent.layout.width)}
    style={{ height: 7, width: '100%', overflow: 'hidden', borderRadius: 3.5 }}>
    <View style={{ height: 7, width: 7, borderRadius: 3.5,
      backgroundColor: dotColor, opacity: playing ? 0 : 1 }} />
    <Animated.View pointerEvents="none" style={{ position: 'absolute', left: 0, top: 0,
      width: '100%', height: 7, borderRadius: 3.5, backgroundColor: colors.success, opacity,
      transform: [{ translateX: progress.interpolate({ inputRange: [0, 1], outputRange: [-width, 0] }) }] }} />
  </View>;
}
