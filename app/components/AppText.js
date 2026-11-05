import React from 'react';
import { Text } from 'react-native';
import { useAppTheme } from '../theme/ThemeProvider';

function AppText({ children, size, color, weight, style, ...props }) {
  const { colors } = useAppTheme();
  return <Text {...props} style={[{ fontSize: size, color: color ?? colors.text, fontWeight: weight }, style]}>
    {children}
  </Text>;
}
export default AppText;
