import React, { useCallback, useEffect, useRef } from 'react';
import { Keyboard, TextInput } from 'react-native';
import { ScrollView } from './OverflowLists';
import { focusedFieldOffset } from './formKeyboard.mjs';

export default function FormScrollView({ onFocus, onLayout, onContentSizeChange, onScroll, ...props }) {
  const scroll = useRef(null);
  const offset = useRef(0);
  const frame = useRef(null);

  const revealFocusedField = useCallback(() => {
    globalThis.cancelAnimationFrame(frame.current);
    frame.current = requestAnimationFrame(() => {
      const input = TextInput.State.currentlyFocusedInput();
      const viewport = scroll.current?.getNativeScrollRef();
      if (!input || !viewport) return;
      viewport.measureInWindow((x, y, width, height) => {
        input.measureInWindow((fieldX, fieldY, fieldWidth, fieldHeight) => {
          if (TextInput.State.currentlyFocusedInput() !== input) return;
          const next = focusedFieldOffset({
            field: { y: fieldY, height: fieldHeight },
            viewport: { y, height },
            keyboardTop: Keyboard.metrics()?.screenY,
            offset: offset.current,
          });
          if (Math.abs(next - offset.current) > 1) {
            scroll.current?.scrollTo({ y: next, animated: true });
          }
        });
      });
    });
  }, []);

  useEffect(() => {
    const shown = Keyboard.addListener('keyboardDidShow', revealFocusedField);
    const changed = Keyboard.addListener('keyboardDidChangeFrame', revealFocusedField);
    return () => {
      shown.remove();
      changed.remove();
      globalThis.cancelAnimationFrame(frame.current);
    };
  }, [revealFocusedField]);

  return <ScrollView {...props} ref={scroll}
    onFocus={event => { onFocus?.(event); revealFocusedField(); }}
    onLayout={event => { onLayout?.(event); revealFocusedField(); }}
    onContentSizeChange={(width, height) => { onContentSizeChange?.(width, height); revealFocusedField(); }}
    onScroll={event => { offset.current = event.nativeEvent.contentOffset.y; onScroll?.(event); }}
  />;
}
