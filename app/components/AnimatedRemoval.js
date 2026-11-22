import React, { useEffect, useRef } from 'react';
import { AccessibilityInfo, Animated, StyleSheet } from 'react-native';
import { useAppTheme } from '../theme/ThemeProvider';

// Match the Logbook's 600 ms red tint, fade and collapse after deletion succeeds.
export default function AnimatedRemoval({ removing, onRemoved, children }) {
  const { colors } = useAppTheme();
  const progress = useRef(new Animated.Value(1)).current;
  const height = useRef(0);
  const finished = useRef(onRemoved);
  finished.current = onRemoved;
  useEffect(() => {
    if (!removing) { progress.setValue(1); return; }
    let active = true;
    let animation;
    const start = reduce => {
      if (!active) return;
      if (reduce) { finished.current(); return; }
      animation = Animated.timing(progress, { toValue: 0, duration: 600, useNativeDriver: false });
      animation.start(result => { if (active && result.finished) finished.current(); });
    };
    AccessibilityInfo.isReduceMotionEnabled().then(start, () => start(false));
    return () => { active = false; animation?.stop(); };
  }, [removing, progress]);
  const exit = progress.interpolate({ inputRange: [0, 0.75, 1], outputRange: [0, 1, 1] });
  return <Animated.View pointerEvents={removing ? 'none' : 'auto'}
    accessibilityElementsHidden={removing} importantForAccessibility={removing ? 'no-hide-descendants' : 'auto'}
    onLayout={event => { if (!removing) height.current = event.nativeEvent.layout.height; }}
    style={removing ? { overflow: 'hidden', opacity: exit, height: height.current ? Animated.multiply(exit, height.current) : undefined } : undefined}>
    {children}
    {removing && <Animated.View pointerEvents="none" style={[StyleSheet.absoluteFill, {
      borderRadius: 10, backgroundColor: colors.actionDanger,
      opacity: progress.interpolate({ inputRange: [0, 0.75, 1], outputRange: [0.4, 0.4, 0] }),
    }]} />}
  </Animated.View>;
}
