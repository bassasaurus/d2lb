import React, { forwardRef, useEffect, useRef, useState } from 'react';
import { FlatList as NativeFlatList, ScrollView as NativeScrollView, View } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useAppTheme } from '../theme/ThemeProvider';
import { scrollOverflow } from './scrollOverflow.mjs';

export function withScrollOverflow(Component) {
  return forwardRef(function OverflowList({ style, horizontal = false, onLayout, onContentSizeChange, onScroll,
    onScrollBeginDrag, onScrollEndDrag, onMomentumScrollBegin, onMomentumScrollEnd,
    scrollEventThrottle = 16, ...props }, ref) {
    const { colors } = useAppTheme();
    const metrics = useRef({});
    const [scrolling, setScrolling] = useState(false);
    const activity = useRef({ dragging: false, momentum: false });
    const idleTimer = useRef(null);
    useEffect(() => () => clearTimeout(idleTimer.current), []);
    function hideIndicators() {
      clearTimeout(idleTimer.current);
      setScrolling(true);
    }
    function showWhenIdle() {
      clearTimeout(idleTimer.current);
      if (!activity.current.dragging && !activity.current.momentum) {
        idleTimer.current = setTimeout(() => setScrolling(false), 180);
      }
    }
    const [edges, setEdges] = useState({ before: false, after: false });
    function update(values) {
      metrics.current = { ...metrics.current, ...values };
      const next = scrollOverflow(metrics.current);
      setEdges(old => old.before === next.before && old.after === next.after ? old : next);
    }
    const indicator = before => <View pointerEvents="none" accessibilityElementsHidden importantForAccessibility="no-hide-descendants"
      style={{ position: 'absolute', zIndex: 10, elevation: 4, borderRadius: 10,
        backgroundColor: `${colors.surface}E6`, borderWidth: 1, borderColor: colors.border,
        ...(horizontal ? { top: '50%', marginTop: -10, [before ? 'left' : 'right']: 4 }
          : { left: '50%', marginLeft: -14, [before ? 'top' : 'bottom']: 4 }) }}>
      <MaterialCommunityIcons name={`chevron-${horizontal ? before ? 'left' : 'right' : before ? 'up' : 'down'}`}
        size={24} color={colors.muted} />
    </View>;
    return <View style={[{ flexGrow: 1, flexShrink: 1, alignSelf: 'stretch' }, style]}>
      <Component {...props} ref={ref} horizontal={horizontal}
        style={{ flexGrow: 1, flexShrink: 1 }} scrollEventThrottle={scrollEventThrottle}
        showsVerticalScrollIndicator={!horizontal} showsHorizontalScrollIndicator={horizontal} persistentScrollbar
        onLayout={event => { update({ viewport: event.nativeEvent.layout[horizontal ? 'width' : 'height'] }); onLayout?.(event); }}
        onContentSizeChange={(width, height) => { update({ content: horizontal ? width : height }); onContentSizeChange?.(width, height); }}
        onScrollBeginDrag={event => {
          activity.current.dragging = true;
          hideIndicators();
          onScrollBeginDrag?.(event);
        }}
        onScrollEndDrag={event => {
          activity.current.dragging = false;
          showWhenIdle();
          onScrollEndDrag?.(event);
        }}
        onMomentumScrollBegin={event => {
          activity.current.momentum = true;
          hideIndicators();
          onMomentumScrollBegin?.(event);
        }}
        onMomentumScrollEnd={event => {
          activity.current.momentum = false;
          showWhenIdle();
          onMomentumScrollEnd?.(event);
        }}
        onScroll={event => {
          hideIndicators();
          showWhenIdle();
          const { contentOffset, layoutMeasurement, contentSize, contentInset } = event.nativeEvent;
          update({ offset: contentOffset[horizontal ? 'x' : 'y'], viewport: layoutMeasurement[horizontal ? 'width' : 'height'],
            content: contentSize[horizontal ? 'width' : 'height'], insetEnd: contentInset?.[horizontal ? 'right' : 'bottom'] || 0 });
          onScroll?.(event);
        }} />
      {!scrolling && edges.before && indicator(true)}
      {!scrolling && edges.after && indicator(false)}
    </View>;
  });
}
export const ScrollView = withScrollOverflow(NativeScrollView);
export const FlatList = withScrollOverflow(NativeFlatList);
