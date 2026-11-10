import React, { useEffect, useState } from 'react';
import { Modal, ScrollView, StyleSheet } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAppTheme } from '../theme/ThemeProvider';
import Text from './AppText';
import Card from './Card';
import PrimaryActionButton from './PrimaryActionButton';

// Rebuilds of this announcement share the key. Change it with new notes.
const SEEN_KEY = 'whats-new:reminders-and-logbook';
const HIGHLIGHTS = [
  'Find Manage Reminders in the main menu and track flight-time milestones.',
  'See medical certificate alerts in the Logbook. Dismiss the yellow warning or tap Update to edit your certificate.',
  'Spot flights waiting to sync or needing your attention with orange and red indicators.',
];

export default function WhatsNew() {
  const { colors } = useAppTheme();
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    let active = true;
    AsyncStorage.getItem(SEEN_KEY).then(value => {
      if (active && value === null) setVisible(true);
    }).catch(() => {});
    return () => { active = false; };
  }, []);

  function dismiss() {
    setVisible(false);
    AsyncStorage.setItem(SEEN_KEY, 'seen').catch(() => {});
  }

  if (!visible) return null;

  return (
    <Modal transparent animationType="fade" onRequestClose={dismiss}>
      <SafeAreaView style={[styles.overlay, { backgroundColor: `${colors.shadow}80` }]}>
        <Card style={styles.card} accessibilityViewIsModal>
          <Text size={22} weight="600" accessibilityRole="header">What’s in this update</Text>
          <ScrollView style={styles.notes} contentContainerStyle={styles.highlights}>
            {HIGHLIGHTS.map(highlight => <Text key={highlight}>{highlight}</Text>)}
          </ScrollView>
          <PrimaryActionButton testID="whats-new-dismiss" title="Got it" onPress={dismiss} />
        </Card>
      </SafeAreaView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 20 },
  card: { width: '100%', maxWidth: 420, maxHeight: '90%', padding: 20, gap: 16 },
  notes: { flexGrow: 0 },
  highlights: { gap: 12 },
});
