import React, { useEffect, useRef, useState } from 'react';
import { Animated, Text } from 'react-native';
import { useAppTheme } from '../theme/ThemeProvider';

export default function SyncStatusNotice({ visible, message, error = false }) {
  const { colors } = useAppTheme();
  const [height, setHeight] = useState(28);
  const progress = useRef(new Animated.Value(visible ? 1 : 0)).current;
  useEffect(() => {
    const animation = Animated.timing(progress, { toValue: visible ? 1 : 0, duration: 250, useNativeDriver: false });
    animation.start();
    return () => animation.stop();
  }, [visible, progress]);
  return <Animated.View pointerEvents="none" accessibilityElementsHidden={!visible}
    importantForAccessibility={visible ? 'auto' : 'no-hide-descendants'}
    style={{ overflow: 'hidden', opacity: progress, height: progress.interpolate({ inputRange: [0, 1], outputRange: [0, height] }) }}>
    <Text onLayout={event => setHeight(event.nativeEvent.layout.height)} accessibilityLiveRegion="polite"
      style={{ position: 'absolute', left: 0, right: 0, textAlign: 'center', paddingVertical: 4,
        paddingHorizontal: 10, color: error ? colors.danger : colors.muted }}>{message}</Text>
  </Animated.View>;
}
