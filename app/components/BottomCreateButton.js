import React from 'react';
import { View } from 'react-native';
import PrimaryActionButton from './PrimaryActionButton';
import { useAppTheme } from '../theme/ThemeProvider';

export default function BottomCreateButton({ title, onPress, horizontalPadding = 12 }) {
  const { colors } = useAppTheme();
  return <View style={{ paddingHorizontal: horizontalPadding, paddingVertical: 10,
    borderTopWidth: 1, borderTopColor: colors.border, backgroundColor: colors.background }}>
    <PrimaryActionButton title={title} onPress={onPress} icon="plus" />
  </View>;
}
