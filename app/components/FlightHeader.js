import React from 'react';
import { StyleSheet, View } from 'react-native';
import AppText from './AppText';
import { useAppTheme } from '../theme/ThemeProvider';

// Keep list and detail headers consistent, including phone-width text fitting.
export default function FlightHeader({ date, type, reg, dur }) {
  const { colors } = useAppTheme();
  return <View style={styles.row}>
    <AppText size={16} color={colors.primary} weight="bold" numberOfLines={1}
      adjustsFontSizeToFit minimumFontScale={0.8} style={styles.date}>{date}</AppText>
    <AppText size={16} color={colors.primary} weight="bold" numberOfLines={1}
      adjustsFontSizeToFit minimumFontScale={0.75} style={styles.aircraft}>{type}{'  '}{reg}</AppText>
    <AppText size={16} color={colors.primary} weight="bold" numberOfLines={1}
      adjustsFontSizeToFit minimumFontScale={0.8} style={styles.duration}>{dur}</AppText>
  </View>;
}
const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 5 },
  date: { width: '30%', flexShrink: 0 },
  aircraft: { flex: 1, minWidth: 0, textAlign: 'center' },
  duration: { width: '30%', flexShrink: 0, textAlign: 'right', fontVariant: ['tabular-nums'] },
});
