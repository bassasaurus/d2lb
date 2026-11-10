import React, { useCallback, useRef, useState } from 'react';
import { Alert, StyleSheet, View } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import api from '../api/axiosConfig';
import { useAppTheme } from '../theme/ThemeProvider';
import AppText from './AppText';
import PlatformActionButton from './PlatformActionButton';

export default function LogbookReminders() {
  const { colors } = useAppTheme();
  const [reminders, setReminders] = useState([]);
  const [dismissing, setDismissing] = useState(false);
  const revision = useRef(0);

  useFocusEffect(useCallback(() => {
    const request = ++revision.current;
    api.get('/api/mobile/reminders/').then(({ data }) => {
      if (revision.current === request) setReminders(Array.isArray(data?.reminders) ? data.reminders : []);
    }).catch(() => {
      // Reminders are optional and require an available, updated server.
      if (revision.current === request) setReminders([]);
    });
    return () => { revision.current += 1; };
  }, []));

  async function dismiss(reminder) {
    const request = ++revision.current;
    setDismissing(true);
    try {
      const { data } = await api.post(`/api/mobile/reminders/${reminder.id}/dismiss/`, { key: reminder.key });
      if (revision.current === request) setReminders(Array.isArray(data?.reminders) ? data.reminders : []);
    } catch {
      if (revision.current === request) Alert.alert('Reminder not dismissed', 'Try again when connected.');
    } finally {
      setDismissing(false);
    }
  }

  return reminders.map(reminder => {
    const color = colors[reminder.severity] ?? colors.text;
    return (
      <View key={reminder.id} style={styles.row}>
        <AppText color={color} style={styles.message}>
          <AppText weight="600" color={color}>{reminder.title}</AppText>{'\n'}{reminder.message}
        </AppText>
        <PlatformActionButton title="Dismiss" variant="text" accessibilityLabel={`Dismiss ${reminder.title}`}
          disabled={dismissing} onPress={() => dismiss(reminder)} />
      </View>
    );
  });
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  message: { flex: 1 },
});
