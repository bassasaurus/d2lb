import React, { useState } from 'react';
import { Pressable, View } from 'react-native';
import Card from '../components/Card';
import Text from '../components/AppText';
import PlatformActionButton from '../components/PlatformActionButton';
import { compareVersions } from './comparison.mjs';
import { useAppTheme } from '../theme/ThemeProvider';

export default function VersionComparison({ kind, local, server, selected, onSelect, localEnabled = false, serverEnabled = false }) {
  const { colors } = useAppTheme();
  const [showAll, setShowAll] = useState(false);
  const rows = compareVersions(kind, local, server);
  const differences = rows.filter(row => row.changed);
  const visible = showAll || !differences.length ? rows : differences;
  return <View style={{ gap: 12, marginVertical: 12 }}>
    {[["local", 'On this device', localEnabled], ["server", 'Saved online', serverEnabled]].map(([key, title, enabled]) =>
      <Pressable key={key} disabled={!enabled} accessibilityRole={enabled ? 'radio' : undefined}
        accessibilityState={{ checked: selected === key, disabled: !enabled }} accessibilityLabel={`Keep record ${title.toLowerCase()}`}
        onPress={() => onSelect(key)}>
        <Card style={{ borderWidth: 2, borderColor: selected === key ? colors.primary : colors.border,
          backgroundColor: selected === key ? colors.selected : colors.surface }}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', gap: 12, marginBottom: 8 }}>
            <Text size={18} weight="600">{title}</Text>
            {enabled && <Text color={colors.primary} weight="600">{selected === key ? '✓ Selected' : 'Select'}</Text>}
          </View>
          {key === 'server' && !server ? <Text color={colors.muted}>This record was deleted online.</Text>
            : visible.map(row => <View key={row.key} style={{ flexDirection: 'row', gap: 12, paddingVertical: 5 }}>
              <Text color={colors.muted} style={{ flex: 1 }}>{row.label}</Text>
              <Text selectable weight={row.changed ? '600' : undefined} style={{ flex: 1, textAlign: 'right' }}>
                {key === 'local' ? row.localValue : row.serverValue}
              </Text>
            </View>)}
          {key === 'local' && local.sync_state === 'pending_delete' && <Text color={colors.danger} style={{ marginTop: 8 }}>Deletion requested on this device.</Text>}
        </Card>
      </Pressable>)}
    <PlatformActionButton title={showAll ? 'Show differences' : 'Show all details'} variant="text" onPress={() => setShowAll(value => !value)} />
  </View>;
}
