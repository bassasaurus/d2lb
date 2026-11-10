import React from 'react';
import AppButton from './AppButton';

export default function PlatformActionButton({ destructive = false, ...props }) {
  return <AppButton {...props} tone={destructive ? 'danger' : 'default'} />;
}
