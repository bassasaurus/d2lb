import React, { useContext } from 'react';
import { KeyboardAvoidingView, Platform } from 'react-native';
import { HeaderHeightContext } from '@react-navigation/elements';

export default function FormKeyboardAvoidingView(props) {
  const headerHeight = useContext(HeaderHeightContext) ?? 0;
  return <KeyboardAvoidingView {...props} behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    keyboardVerticalOffset={headerHeight} />;
}
