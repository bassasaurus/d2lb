import React, { useEffect, useState } from 'react';
import { Modal, ScrollView, StyleSheet } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAppTheme } from '../theme/ThemeProvider';
import Text from './AppText';
import Card from './Card';
import PrimaryActionButton from './PrimaryActionButton';

import { updateNotes } from './updateNotes';

const SEEN_KEY = `whats-new:${updateNotes.id}`;

export default function WhatsNew({ visible: requestedVisible, onDismiss }) {
  const { colors } = useAppTheme();
  const [automaticVisible, setVisible] = useState(false);

  useEffect(() => {
    if (requestedVisible !== undefined) return;
    let active = true;
    AsyncStorage.getItem(SEEN_KEY).then(value => {
      if (active && value === null) setVisible(true);
    }).catch(() => {});
    return () => { active = false; };
  }, [requestedVisible]);

  function dismiss() {
    setVisible(false);
    onDismiss?.();
    AsyncStorage.setItem(SEEN_KEY, 'seen').catch(() => {});
  }

  if (!(requestedVisible ?? automaticVisible)) return null;

  return (
    <Modal animationType="fade" presentationStyle="fullScreen" onRequestClose={dismiss}>
      <SafeAreaView style={[styles.screen, { backgroundColor: colors.background }]}>
        <Card style={styles.content} accessibilityViewIsModal>
          <Text size={22} weight="600" accessibilityRole="header">What’s in this update</Text>
          <ScrollView style={styles.notes} contentContainerStyle={styles.highlights}>
            {updateNotes.highlights.map(highlight => <Text key={highlight}>{highlight}</Text>)}
          </ScrollView>
          <PrimaryActionButton testID="whats-new-dismiss" title="Got it" onPress={dismiss} />
        </Card>
      </SafeAreaView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 20 },
  content: { width: '100%', maxWidth: 420, maxHeight: '100%', gap: 16 },
  notes: { flexGrow: 0 },
  highlights: { gap: 12 },
});
