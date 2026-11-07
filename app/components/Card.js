import React from 'react';
import { View } from 'react-native';
import { useAppTheme } from '../theme/ThemeProvider';

export default function Card({ children, style, compact = false, ...props }) {
  const { colors } = useAppTheme();
  return <View {...props} style={[{ backgroundColor: colors.surface, borderRadius: 10, paddingHorizontal: compact ? 12 : 14, paddingVertical: compact ? 8 : 14 }, style]}>
    {children}
  </View>;
}
