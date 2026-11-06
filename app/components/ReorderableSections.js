import React, { useEffect, useRef, useState } from 'react';
import { Animated, PanResponder, View } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useAppTheme } from '../theme/ThemeProvider';
import { dropSection, moveSection } from '../stats/sectionOrder.mjs';

function Section({ id, title, order, layouts, onChange, onDragChange, children }) {
  const { colors } = useAppTheme();
  const offset = useRef(new Animated.Value(0)).current;
  const [dragging, setDragging] = useState(false);
  const latest = useRef({ order, layouts, onChange, onDragChange });
  latest.current = { order, layouts, onChange, onDragChange };
  const active = useRef(false);
  const timer = useRef(null);
  const dy = useRef(0);
  const finish = commit => {
    clearTimeout(timer.current);
    const current = latest.current;
    if (active.current && commit && current.layouts.current[id]) {
      const next = dropSection(current.order, id, current.layouts.current[id].y + 24 + dy.current, current.layouts.current);
      if (next.join() !== current.order.join()) current.onChange(next);
    }
    active.current = false;
    setDragging(false);
    current.onDragChange(false);
    offset.setValue(0);
  };
  const responder = useRef(PanResponder.create({
    onStartShouldSetPanResponder: () => true,
    onPanResponderGrant: () => {
      dy.current = 0;
      timer.current = setTimeout(() => {
        active.current = true;
        setDragging(true);
        latest.current.onDragChange(true);
      }, 200);
    },
    onPanResponderMove: (_, gesture) => {
      dy.current = gesture.dy;
      if (!active.current) {
        if (Math.abs(gesture.dy) > 8 || Math.abs(gesture.dx) > 8) clearTimeout(timer.current);
        return;
      }
      offset.setValue(gesture.dy);
    },
    onPanResponderRelease: () => finish(true),
    onPanResponderTerminate: () => finish(false),
    onPanResponderTerminationRequest: () => !active.current,
  })).current;
  useEffect(() => () => { clearTimeout(timer.current); if (active.current) latest.current.onDragChange(false); }, []);
  const handle = <View {...responder.panHandlers} accessible accessibilityRole="adjustable"
    accessibilityLabel={`Reorder ${title}`} accessibilityHint="Hold and drag up or down. Swipe up or down with a screen reader to move."
    accessibilityActions={[{ name: 'increment', label: 'Move down' }, { name: 'decrement', label: 'Move up' }]}
    onAccessibilityAction={event => {
      const current = latest.current;
      const index = current.order.indexOf(id);
      current.onChange(moveSection(current.order, id, index + (event.nativeEvent.actionName === 'increment' ? 1 : -1)));
    }} style={{ width: 44, minHeight: 48, alignItems: 'center', justifyContent: 'center' }}>
    <MaterialCommunityIcons name="drag-horizontal" size={24} color={colors.muted} />
  </View>;
  return <Animated.View onLayout={event => { layouts.current[id] = event.nativeEvent.layout; }}
    style={{ transform: [{ translateY: offset }], zIndex: dragging ? 100 : 0, elevation: dragging ? 8 : 0,
      opacity: dragging ? 0.9 : 1, backgroundColor: dragging ? colors.background : 'transparent' }}>
    {children(handle)}
  </Animated.View>;
}
export default function ReorderableSections({ sections, order, onChange, onDragChange }) {
  const layouts = useRef({});
  const visible = sections.filter(section => section.visible !== false);
  useEffect(() => {
    for (const key of Object.keys(layouts.current)) if (!visible.some(section => section.id === key)) delete layouts.current[key];
  }, [sections]);
  return <View>{order.map(id => {
    const section = visible.find(item => item.id === id);
    return section ? <Section key={id} id={id} title={section.title} order={order} layouts={layouts}
      onChange={onChange} onDragChange={onDragChange}>{section.render}</Section> : null;
  })}</View>;
}
