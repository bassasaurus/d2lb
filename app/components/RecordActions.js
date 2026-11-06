import React from 'react';
import { StyleSheet, View } from 'react-native';
import PlatformActionButton from './PlatformActionButton';

export default function RecordActions({ onDelete, onUpdate, recordName = 'record' }) {
  return <View style={styles.row}>
    {onDelete && <View style={styles.action}>
      <PlatformActionButton title="Delete" variant="text" destructive accessibilityLabel={`Delete ${recordName}`}
        onPress={onDelete} />
    </View>}
    <View style={styles.action}>
      <PlatformActionButton title="Update" variant="text" accessibilityLabel={`Update ${recordName}`}
        onPress={onUpdate} />
    </View>
  </View>;
}
const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: 8, marginVertical: 0 },
  action: { flex: 1, minHeight: 44, justifyContent: 'center' },
});
