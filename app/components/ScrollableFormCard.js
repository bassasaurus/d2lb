import React from 'react';
import { SafeAreaView } from 'react-native-safe-area-context';
import Card from './Card';
import { ScrollView } from './OverflowLists';
import { useAppTheme } from '../theme/ThemeProvider';

export default function ScrollableFormCard({ children, footer, cardStyle, keyboardDismissMode }) {
  const { colors } = useAppTheme();
  return <>
    <ScrollView style={{ flex: 1, backgroundColor: colors.background }}
      contentContainerStyle={{ padding: 12, paddingBottom: 24 }}
      keyboardShouldPersistTaps="handled" keyboardDismissMode={keyboardDismissMode}>
      <Card style={cardStyle}>{children}</Card>
    </ScrollView>
    <SafeAreaView edges={['bottom', 'left', 'right']}
      style={{ backgroundColor: colors.background, borderTopWidth: 1, borderTopColor: colors.border,
        paddingHorizontal: 12, paddingVertical: 8 }}>
      {footer}
    </SafeAreaView>
  </>;
}
