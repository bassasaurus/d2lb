import React from 'react';
import { KeyboardAwareScrollView, nativeKeyboardAvailable } from './keyboardController';
import { withScrollOverflow } from './OverflowLists';

const AwareScrollView = withScrollOverflow(KeyboardAwareScrollView);

export default function FormScrollView({ bottomOffset = 12, ...props }) {
  return <AwareScrollView keyboardShouldPersistTaps="handled" {...props}
    {...(nativeKeyboardAvailable ? { bottomOffset, disableScrollOnKeyboardHide: true } : {})} />;
}
