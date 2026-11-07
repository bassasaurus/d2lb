import React, { useEffect, useRef, useState } from 'react';
import { Alert, Animated, PanResponder, View } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useAppTheme } from '../theme/ThemeProvider';
import { buttonBounds, buttonPoint, buttonPreference, clampButtonPoint, createButtonPositionStore } from '../preferences/floatingButton.mjs';

const positions = createButtonPositionStore(AsyncStorage);
export default function RoundButton({ onPress, buttonSize = 60, buttonColor }) {
  const { styles: STYLES } = useAppTheme();
  const insets = useSafeAreaInsets();
  const [layout, setLayout] = useState({ width: 0, height: 0 });
  const [preference, setPreference] = useState(positions.snapshot());
  const position = useRef(new Animated.ValueXY()).current;
  const latest = useRef({});
  const gesture = useRef({});
  const bounds = buttonBounds(layout.width, layout.height, buttonSize, insets.bottom);
  latest.current = { onPress, bounds, preference };
  useEffect(() => {
    const unsubscribe = positions.subscribe(setPreference);
    positions.load();
    return unsubscribe;
  }, []);
  useEffect(() => {
    if (!gesture.current.active) position.setValue(buttonPoint(preference, bounds));
  }, [preference, layout.width, layout.height, buttonSize, insets.bottom, position]);
  const responder = useRef(PanResponder.create({
    onStartShouldSetPanResponder: () => true,
    onPanResponderGrant: () => {
      const start = buttonPoint(latest.current.preference, latest.current.bounds);
      gesture.current = { active: true, moved: false, start, point: start };
    },
    onPanResponderMove: (_, event) => {
      const state = gesture.current;
      if (!state.active) return;
      if (Math.hypot(event.dx, event.dy) > 6) state.moved = true;
      if (!state.moved) return;
      state.point = clampButtonPoint({ x: state.start.x + event.dx, y: state.start.y + event.dy }, latest.current.bounds);
      position.setValue(state.point);
    },
    onPanResponderRelease: () => {
      const state = gesture.current;
      state.active = false;
      if (state.moved) {
        positions.save(buttonPreference(state.point, latest.current.bounds)).catch(() =>
          Alert.alert('Position not saved', 'The button moved, but its position could not be saved for next time.'));
      } else latest.current.onPress?.();
    },
    onPanResponderTerminate: () => {
      gesture.current.active = false;
      position.setValue(buttonPoint(latest.current.preference, latest.current.bounds));
    },
    onPanResponderTerminationRequest: () => false,
  })).current;
  return <View pointerEvents="box-none" onLayout={event => setLayout(event.nativeEvent.layout)}
    style={{ position: 'absolute', top: 0, bottom: 0, left: 0, right: 0, zIndex: 50 }}>
    {layout.width > 0 && <Animated.View {...responder.panHandlers} accessible accessibilityRole="button"
      onAccessibilityTap={onPress} accessibilityLabel="Add a new record" accessibilityHint="Tap to add. Drag to reposition."
      accessibilityActions={[{ name: 'activate', label: 'Add a new record' }, { name: 'reset', label: 'Reset position' }]}
      onAccessibilityAction={event => {
        if (event.nativeEvent.actionName === 'activate') onPress?.();
        else positions.save({ x: 1, y: 1 }).catch(() => Alert.alert('Position not saved', 'Please try again.'));
      }}
      style={{ position: 'absolute', left: 0, top: 0, transform: position.getTranslateTransform(),
        width: buttonSize, height: buttonSize, borderRadius: buttonSize / 2,
        backgroundColor: buttonColor, alignItems: 'center', justifyContent: 'center', elevation: 6 }}>
      <MaterialCommunityIcons name="plus" size={50} color={STYLES.onAction} />
    </Animated.View>}
  </View>;
}
