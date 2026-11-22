import RecordIssue from './RecordIssue';
import RecordSyncIndicator from './RecordSyncIndicator';
import Card from './Card';
import FlightHeader from './FlightHeader';
import { useMemo } from 'react';
import React from 'react';
import { StyleSheet } from 'react-native';
import { useAppTheme } from '../theme/ThemeProvider';

function FlightItem({ date, route, type, reg, dur, crew, syncEvent, item, navigation, scope }) {
  const { styles: STYLES } = useAppTheme();
  const styles = useMemo(() => createStyles(STYLES), [STYLES]);
  return <Card compact style={styles.itemContainer}>
    <FlightHeader date={date} type={type} reg={reg} dur={dur} route={route} crew={crew} />
    <RecordIssue item={item} kind="flight" navigation={navigation} />
    <RecordSyncIndicator item={item} syncEvent={syncEvent} scope={scope} />
  </Card>;
}
const createStyles = STYLES => StyleSheet.create({
  itemContainer: { width: '100%' },
  row: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 3 },
  route: { flex: 1, minWidth: 0 },
  crew: { flexShrink: 0, textAlign: 'right' },
});
export default FlightItem;
