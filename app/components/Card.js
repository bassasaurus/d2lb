import React from 'react';
import { View } from 'react-native';
import { useAppTheme } from '../theme/ThemeProvider';

export default function Card({ children, style, ...props }) {
  const { colors } = useAppTheme();
  return <View {...props} style={[{ backgroundColor: colors.surface, borderRadius: 10, padding: 14 }, style]}>
    {children}
  </View>;
}
