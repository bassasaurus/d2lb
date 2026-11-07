import React from 'react';
import { Platform, Pressable, Text, View } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useAppTheme } from '../theme/ThemeProvider';

export default function BottomCreateButton({ title, onPress, horizontalPadding = 12 }) {
  const { colors } = useAppTheme();
  return <View style={{ paddingHorizontal: horizontalPadding, paddingVertical: 10,
    borderTopWidth: 1, borderTopColor: colors.border, backgroundColor: colors.background }}>
    <Pressable accessibilityRole="button" accessibilityLabel={title} onPress={onPress}
      android_ripple={{ color: '#ffffff30' }}
      style={({ pressed }) => ({ minHeight: 48, paddingHorizontal: 16, paddingVertical: 12,
        flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
        borderRadius: Platform.OS === 'android' ? 24 : 10, overflow: 'hidden',
        backgroundColor: colors.actionGreen, opacity: pressed && Platform.OS === 'ios' ? 0.75 : 1 })}>
      <MaterialCommunityIcons name="plus" size={22} color={colors.onAction} />
      <Text style={{ color: colors.onAction, fontSize: 17, fontWeight: '600' }}>{title}</Text>
    </Pressable>
  </View>;
}
