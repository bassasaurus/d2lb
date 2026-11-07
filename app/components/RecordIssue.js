import React from 'react';
import { Pressable, View } from 'react-native';
import Text from './AppText';
import { useAppTheme } from '../theme/ThemeProvider';

export function reviewRecord(navigation, kind, item) {
  navigation.navigate('SyncReview', { screen: 'SyncConflict', params: { kind, localId: item.local_id }, initial: false });
}
export default function RecordIssue({ item, kind, navigation }) {
  const { colors } = useAppTheme();
  if (!item?.needs_attention) return null;
  return <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
    <Text color={colors.danger} weight="600">Update needed</Text>
    <Pressable accessibilityRole="button" accessibilityLabel="Review this record" hitSlop={4}
      onPress={event => { event.stopPropagation(); reviewRecord(navigation, kind, item); }}
      style={{ minHeight: 44, justifyContent: 'center', paddingHorizontal: 8 }}>
      <Text color={colors.primary} weight="600">Review</Text>
    </Pressable>
  </View>;
}
