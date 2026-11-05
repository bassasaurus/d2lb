import { useMemo } from 'react';
import React, { useState } from 'react';
import { Button, StyleSheet, View } from 'react-native';
import Text from '../components/AppText';
import { compareVersions } from './comparison.mjs';
import { useAppTheme } from '../theme/ThemeProvider';
export default function VersionComparison({ kind, local, server }) {
  const { styles: STYLES } = useAppTheme();
  const styles = useMemo(() => createStyles(STYLES), [STYLES]);
  const [showAll, setShowAll] = useState(false);
  const rows = compareVersions(kind, local, server);
  const changes = rows.filter(row => row.changed);
  return <View style={{ marginVertical: 16 }}>
    <View style={styles.columns}><Text style={styles.column}>On this device</Text><Text style={styles.column}>On the server</Text></View>
    {!changes.length && <Text style={{ marginVertical: 12 }}>The displayed values match. The record or its related data may have changed since it was downloaded.</Text>}
    {(showAll ? rows : changes).map(row => <View key={row.key} style={styles.row}>
      <Text style={{ fontWeight: '600', color: row.changed ? STYLES.blue : STYLES.black }}>{row.label}</Text>
      <View style={styles.columns}><Text selectable style={styles.column}>{row.localValue}</Text><Text selectable style={styles.column}>{row.serverValue}</Text></View>
    </View>)}
    <Button title={showAll ? 'Show differences only' : 'Show all fields'} onPress={() => setShowAll(value => !value)} />
  </View>;
}
const createStyles = STYLES => StyleSheet.create({
  columns: { flexDirection: 'row', gap: 12, marginTop: 6 }, column: { flex: 1, flexShrink: 1 },
  row: { paddingVertical: 12, borderBottomWidth: 1, borderColor: STYLES.grey },
});
