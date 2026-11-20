import React, { useEffect, useId, useRef, useState } from 'react';
import { AccessibilityInfo, Animated, Easing, View } from 'react-native';
import Svg, { Defs, Path, Pattern, Rect } from 'react-native-svg';
import { recordSyncActivity, recordSyncPresentation } from '../api/recordSyncActivity.mjs';
import { useAppTheme } from '../theme/ThemeProvider';

export default function RecordSyncIndicator({ item, scope, animate = true }) {
  const { colors } = useAppTheme();
  const localId = item.local_id ?? `server:${item.id}`;
  const [activity, setActivity] = useState(() => recordSyncActivity.snapshot(scope, localId));
  const { sending, synced, failed } = recordSyncPresentation(item, activity);
  const [reduceMotion, setReduceMotion] = useState(false);
  const [width, setWidth] = useState(0);
  const progress = useRef(new Animated.Value(0)).current;
  const patternId = `sync-stripes-${useId().replace(/[^a-zA-Z0-9]/g, '')}`;
  useEffect(() => {
    const refresh = () => setActivity(recordSyncActivity.snapshot(scope, localId));
    refresh();
    return recordSyncActivity.subscribe((account, record) => {
      if (account === scope && record === localId) refresh();
    });
  }, [scope, localId]);
  useEffect(() => {
    let active = true;
    AccessibilityInfo.isReduceMotionEnabled().then(value => { if (active) setReduceMotion(value); }, () => {});
    const subscription = AccessibilityInfo.addEventListener('reduceMotionChanged', setReduceMotion);
    return () => { active = false; subscription.remove(); };
  }, []);
  const draft = Boolean(item.is_draft);
  const working = !draft && animate && sending;
  useEffect(() => {
    progress.setValue(0);
    if (!working || reduceMotion) return;
    const animation = Animated.loop(Animated.timing(progress, {
      toValue: 1, duration: 500, easing: Easing.linear, useNativeDriver: true,
    }));
    animation.start();
    return () => animation.stop();
  }, [working, reduceMotion, progress]);
  const label = draft ? 'Draft — saved only on this device' : sending ? 'Sync in progress' : failed ? 'Sync failed' : synced ? 'Synced' : 'Pending sync';
  const color = draft ? colors.syncPending : sending ? colors.success : failed ? colors.danger : synced ? colors.success : colors.syncPending;
  return <View accessible accessibilityLabel={label} onLayout={event => setWidth(event.nativeEvent.layout.width)}
    style={{ height: 5, width: '100%', overflow: 'hidden', borderRadius: 2.5, backgroundColor: color }}>
    {(working || draft) && width > 0 && <Animated.View testID="record-sync-animation" pointerEvents="none"
      style={{ position: 'absolute', top: 0, left: -20, width: width + 40, height: 5,
        transform: [{ translateX: progress.interpolate({ inputRange: [0, 1], outputRange: [0, 20] }) }] }}>
      <Svg width="100%" height={5}>
        <Defs><Pattern id={patternId} width={20} height={5} patternUnits="userSpaceOnUse">
          <Path d="M-5 5L0 0H8L3 5ZM15 5L20 0H28L23 5Z" fill="#ffffff" opacity={0.8} />
        </Pattern></Defs>
        <Rect width="100%" height={5} fill={`url(#${patternId})`} />
      </Svg>
    </Animated.View>}
  </View>;
}
