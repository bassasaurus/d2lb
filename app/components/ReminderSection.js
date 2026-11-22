import React, { useState } from 'react';
import { Pressable, View } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import AppText from './AppText';
import { useAppTheme } from '../theme/ThemeProvider';

export default function ReminderSection({ group, renderRow, showAll = false, previewCount = 3 }) {
  const [expanded, setExpanded] = useState(false);
  const { colors } = useAppTheme();
  if (!group.rows.length) return null;
  const hasOthers = !showAll && group.rows.length > previewCount;
  return <View style={{ gap: 4, marginBottom: 8 }}>
    <AppText weight="600" style={{ marginBottom: 4 }}>{group.title}</AppText>
    {(showAll || expanded ? group.rows : group.rows.slice(0, previewCount)).map(renderRow)}
    {hasOthers && <Pressable accessibilityRole="button" accessibilityLabel={`Expand or collapse ${group.title.toLowerCase()}`}
      accessibilityState={{ expanded }} onPress={() => setExpanded(value => !value)}
      style={{ minHeight: 44, alignItems: 'center', justifyContent: 'center', borderTopWidth: 1, borderColor: colors.border }}>
      <MaterialCommunityIcons name={expanded ? 'chevron-up' : 'chevron-down'} color={colors.primary} size={22} />
    </Pressable>}
  </View>;
}
