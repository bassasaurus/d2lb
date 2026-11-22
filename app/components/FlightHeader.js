import { formatDate } from '../formatting/dates.mjs';
import React from 'react';
import { StyleSheet, View } from 'react-native';
import AppText from './AppText';
import { useAppTheme } from '../theme/ThemeProvider';

// A shared two-line header keeps flight lists and details aligned on phones.
export default function FlightHeader({ date, type, reg, dur, route, crew }) {
  const { colors } = useAppTheme();
  const displayDate = formatDate(date, '');
  const split = displayDate.lastIndexOf(', ');
  const day = split >= 0 ? displayDate.slice(0, split) : displayDate;
  const year = split >= 0 ? displayDate.slice(split + 2) : '';
  return <View style={styles.row}>
    <View style={styles.date} accessible accessibilityLabel={displayDate}>
      <AppText size={16} color={colors.primary} weight="bold" numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.8}>{day}</AppText>
      {!!year && <AppText size={16} color={colors.primary} weight="bold">{year}</AppText>}
    </View>
    <View style={styles.aircraft}>
      <AppText size={16} color={colors.primary} weight="bold" numberOfLines={1}
        adjustsFontSizeToFit minimumFontScale={0.75} style={styles.center}>{type}{' '}{reg}</AppText>
      {!!route && <AppText size={16} color={colors.text} numberOfLines={1} ellipsizeMode="middle"
        adjustsFontSizeToFit minimumFontScale={0.8} style={styles.center}>{route}</AppText>}
    </View>
    <View style={styles.duration}>
      <AppText size={16} color={colors.primary} weight="bold" numberOfLines={1}
        adjustsFontSizeToFit minimumFontScale={0.8} style={styles.right}>{dur}</AppText>
      {!!crew && <AppText numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.75} style={styles.right}>{crew}</AppText>}
    </View>
  </View>;
}
const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 5 },
  date: { width: 64, flexShrink: 0 },
  aircraft: { flex: 1, minWidth: 0 },
  center: { textAlign: 'center' },
  duration: { width: 50, flexShrink: 0, fontVariant: ['tabular-nums'] },
  right: { textAlign: 'right' },
});
