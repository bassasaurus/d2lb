import { useMemo } from 'react';
import React from 'react';
import { StyleSheet, View } from 'react-native';
import { useAppTheme } from '../theme/ThemeProvider';
import AppText from './AppText';

function FlightItem({ id, date, route, type, reg, dur, crew }) {
  const { styles: STYLES } = useAppTheme();
  const styles = useMemo(() => createStyles(STYLES), [STYLES]);
  return <View style={styles.itemContainer}>
    <View style={styles.row}>
      <AppText size={16} color={STYLES.blue} weight="bold" numberOfLines={1}
        adjustsFontSizeToFit minimumFontScale={0.8} style={styles.date}>
        {date}
      </AppText>
      <AppText size={16} color={STYLES.blue} weight="bold" numberOfLines={1}
        adjustsFontSizeToFit minimumFontScale={0.75} style={styles.aircraft}>
        {type}{'  '}{reg}
      </AppText>
      <AppText size={16} color={STYLES.blue} weight="bold" numberOfLines={1}
        style={styles.duration}>
        {dur}
      </AppText>
    </View>
    <View style={styles.row}>
      <AppText size={16} color={STYLES.black} numberOfLines={1} ellipsizeMode="middle"
        adjustsFontSizeToFit minimumFontScale={0.8} style={styles.route}>
        {route}
      </AppText>
      <AppText color={STYLES.black} numberOfLines={1} style={styles.crew}>{crew}</AppText>
    </View>
    <View style={[styles.syncIndicator, { backgroundColor: id ? STYLES.success : STYLES.red }]} />
  </View>;
}
const createStyles = STYLES => StyleSheet.create({
  itemContainer: { width: '100%', backgroundColor: STYLES.white, marginTop: 5, paddingTop: 5, paddingHorizontal: 5 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 5 },
  date: { flexShrink: 0, maxWidth: '34%' },
  aircraft: { flex: 1, minWidth: 0, textAlign: 'center' },
  duration: { flexShrink: 0, textAlign: 'right', fontVariant: ['tabular-nums'] },
  route: { flex: 1, minWidth: 0 },
  crew: { flexShrink: 0, textAlign: 'right' },
  syncIndicator: { height: 2, width: '5%' },
});
export default FlightItem;
