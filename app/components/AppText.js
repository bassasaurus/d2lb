import React from 'react';
import { Text } from 'react-native';

function AppText({ children, size, color, weight, style, ...props }) {
  return <Text {...props} style={[{ fontSize: size, color, fontWeight: weight }, style]}>
    {children}
  </Text>;
}
export default AppText;
