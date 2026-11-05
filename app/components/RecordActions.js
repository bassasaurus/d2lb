import React from 'react';
import { StyleSheet, TouchableOpacity, View } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { STYLES } from '../styles/styles';

export default function RecordActions({ onDelete, onUpdate, recordName = 'record' }) {
  return <View style={styles.row}>
    <TouchableOpacity accessibilityRole="button" accessibilityLabel={`Delete ${recordName}`}
      style={[styles.action, styles.delete]} onPress={onDelete}>
      <MaterialCommunityIcons name="delete" size={30} color={STYLES.white} />
    </TouchableOpacity>
    <TouchableOpacity accessibilityRole="button" accessibilityLabel={`Update ${recordName}`}
      style={[styles.action, styles.update]} onPress={onUpdate}>
      <MaterialCommunityIcons name="pencil" size={30} color={STYLES.white} style={{ padding: 5 }} />
    </TouchableOpacity>
  </View>;
}
const styles = StyleSheet.create({
  row: { flexDirection: 'row', marginBottom: 5 },
  action: { flex: 2, alignItems: 'center', justifyContent: 'center' },
  delete: { backgroundColor: STYLES.danger, marginRight: 2.5 },
  update: { backgroundColor: STYLES.blue, marginLeft: 2.5 },
});
