import React, { useEffect, useRef, useState } from 'react';
import { Animated, View } from 'react-native';
import { useAppTheme } from '../theme/ThemeProvider';

export default function FlightSyncIndicator({ synced, syncEvent }) {
  const { colors } = useAppTheme();
  const previous = useRef(synced);
  const lastEvent = useRef(null);
  const progress = useRef(new Animated.Value(0)).current;
  const opacity = useRef(new Animated.Value(0)).current;
  const [width, setWidth] = useState(0);
  const [playing, setPlaying] = useState(false);
  useEffect(() => {
    if (!width) return;
    const confirmedEvent = syncEvent && syncEvent !== lastEvent.current && Date.now() - syncEvent < 5000;
    const completed = synced && (!previous.current || confirmedEvent);
    lastEvent.current = syncEvent;
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
  }, [synced, syncEvent, width, progress, opacity]);
  return <View accessible accessibilityLabel={synced ? 'Synced' : 'Pending sync'}
    onLayout={event => setWidth(event.nativeEvent.layout.width)}
    style={{ height: 7, width: '100%', overflow: 'hidden', borderRadius: 3.5 }}>
    <View style={{ height: 7, width: 7, borderRadius: 3.5,
      backgroundColor: synced ? colors.success : colors.danger, opacity: playing ? 0 : 1 }} />
    <Animated.View pointerEvents="none" style={{ position: 'absolute', left: 0, top: 0,
      width: '100%', height: 7, borderRadius: 3.5, backgroundColor: colors.success, opacity,
      transform: [{ translateX: progress.interpolate({ inputRange: [0, 1], outputRange: [-width, 0] }) }] }} />
  </View>;
}
