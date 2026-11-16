import React, { useContext } from 'react';
import { View } from 'react-native';
import { HeaderHeightContext } from '@react-navigation/elements';
import { KeyboardAvoidingView, nativeKeyboardAvailable } from './keyboardController';

// Native aware scrolling/sticky footers own avoidance. Basic Expo Go builds use
// ordinary padding avoidance; never apply both strategies to the same form.
export default function FormKeyboardAvoidingView({ behavior, keyboardVerticalOffset, enabled, ...props }) {
  const headerHeight = useContext(HeaderHeightContext) ?? 0;
  return nativeKeyboardAvailable ? <View {...props} />
    : <KeyboardAvoidingView {...props} enabled={enabled} behavior="padding" keyboardVerticalOffset={headerHeight} />;
}
