import { useMemo } from 'react';
import React from 'react';
import { StyleSheet, TouchableOpacity, View } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useAppTheme } from '../theme/ThemeProvider';

export default function RecordActions({ onDelete, onUpdate, recordName = 'record' }) {
  const { styles: STYLES } = useAppTheme();
  const styles = useMemo(() => createStyles(STYLES), [STYLES]);
  return <View style={styles.row}>
    {onDelete && <TouchableOpacity accessibilityRole="button" accessibilityLabel={`Delete ${recordName}`}
      style={[styles.action, styles.delete]} onPress={onDelete}>
      <MaterialCommunityIcons name="delete" size={30} color={STYLES.onAction} />
    </TouchableOpacity>}
    <TouchableOpacity accessibilityRole="button" accessibilityLabel={`Update ${recordName}`}
      style={[styles.action, styles.update, !onDelete && { marginLeft: 0 }]} onPress={onUpdate}>
      <MaterialCommunityIcons name="pencil" size={30} color={STYLES.onAction} style={{ padding: 5 }} />
    </TouchableOpacity>
  </View>;
}
const createStyles = STYLES => StyleSheet.create({
  row: { flexDirection: 'row', marginBottom: 5 },
  action: { flex: 2, alignItems: 'center', justifyContent: 'center' },
  delete: { backgroundColor: STYLES.actionDanger, marginRight: 2.5 },
  update: { backgroundColor: STYLES.actionBlue, marginLeft: 2.5 },
});
