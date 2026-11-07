import Card from './Card';
import FlightHeader from './FlightHeader';
import { useMemo } from 'react';
import React from 'react';
import { StyleSheet, View } from 'react-native';
import { useAppTheme } from '../theme/ThemeProvider';
import AppText from './AppText';

function FlightItem({ id, date, route, type, reg, dur, crew }) {
  const { styles: STYLES } = useAppTheme();
  const styles = useMemo(() => createStyles(STYLES), [STYLES]);
  return <Card style={styles.itemContainer}>
    <FlightHeader date={date} type={type} reg={reg} dur={dur} />
    <View style={styles.row}>
      <AppText size={16} color={STYLES.black} numberOfLines={1} ellipsizeMode="middle"
        adjustsFontSizeToFit minimumFontScale={0.8} style={styles.route}>
        {route}
      </AppText>
      <AppText color={STYLES.black} numberOfLines={1} style={styles.crew}>{crew}</AppText>
    </View>
    <View style={[styles.syncIndicator, { backgroundColor: id ? STYLES.success : STYLES.red }]} />
  </Card>;
}
const createStyles = STYLES => StyleSheet.create({
  itemContainer: { width: '100%', padding: 12 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 5 },
  route: { flex: 1, minWidth: 0 },
  crew: { flexShrink: 0, textAlign: 'right' },
  syncIndicator: { height: 2, width: '5%' },
});
export default FlightItem;
