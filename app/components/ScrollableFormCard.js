import React, { useState } from 'react';
import { KeyboardStickyView } from './keyboardController';
import { SafeAreaView } from 'react-native-safe-area-context';
import Card from './Card';
import FormScrollView from './FormScrollView';
import { useAppTheme } from '../theme/ThemeProvider';

export default function ScrollableFormCard({ children, footer, cardStyle, keyboardDismissMode }) {
  const { colors } = useAppTheme();
  const [footerHeight, setFooterHeight] = useState(0);
  return <>
    <FormScrollView bottomOffset={footerHeight + 12} style={{ flex: 1, backgroundColor: colors.background }}
      contentContainerStyle={{ padding: 12, paddingBottom: 24 }}
      keyboardShouldPersistTaps="handled" keyboardDismissMode={keyboardDismissMode}>
      <Card style={cardStyle}>{children}</Card>
    </FormScrollView>
    <KeyboardStickyView>
    <SafeAreaView onLayout={event => setFooterHeight(event.nativeEvent.layout.height)} edges={['bottom', 'left', 'right']}
      style={{ backgroundColor: colors.background, borderTopWidth: 1, borderTopColor: colors.border,
        paddingHorizontal: 12, paddingVertical: 8 }}>
      {footer}
    </SafeAreaView>
    </KeyboardStickyView>
  </>;
}
