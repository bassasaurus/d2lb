import React, { useCallback, useRef, useState } from 'react';
import { Alert, ScrollView, StyleSheet, View } from 'react-native';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import api from '../api/axiosConfig';
import { useAppTheme } from '../theme/ThemeProvider';
import AppText from './AppText';
import PlatformActionButton from './PlatformActionButton';

export default function LogbookReminders({ refreshVersion, style }) {
  const { colors } = useAppTheme();
  const navigation = useNavigation();
  const [reminders, setReminders] = useState([]);
  const [medicalAlert, setMedicalAlert] = useState(null);
  const [dismissing, setDismissing] = useState(false);
  const [openingMedical, setOpeningMedical] = useState(false);
  const revision = useRef(0);

  useFocusEffect(useCallback(() => {
    const request = ++revision.current;
    api.get('/api/mobile/reminders/').then(({ data }) => {
      if (revision.current === request) {
        setReminders(Array.isArray(data?.reminders) ? data.reminders : []);
        setMedicalAlert(data?.medical_alert ?? null);
      }
    }).catch(() => {
      // Reminders are optional and require an available, updated server.
      if (revision.current === request) {
        setReminders([]);
        setMedicalAlert(null);
      }
    });
    return () => { revision.current += 1; };
  }, [refreshVersion]));

  async function dismiss(reminder) {
    const request = ++revision.current;
    setDismissing(true);
    try {
      const medical = reminder.id == null;
      const resource = medical ? 'medical' : reminder.id;
      const { data } = await api.post(`/api/mobile/reminders/${resource}/dismiss/`, { key: reminder.key });
      if (revision.current === request) {
        if (medical) setMedicalAlert(data.medical_alert ?? null);
        else setReminders(Array.isArray(data?.reminders) ? data.reminders : []);
      }
    } catch {
      if (revision.current === request) Alert.alert('Reminder not dismissed', 'Try again when connected.');
    } finally {
      setDismissing(false);
    }
  }

  async function updateMedical() {
    setOpeningMedical(true);
    try {
      const { data } = await api.get('/api/mobile/profile/');
      if (navigation.isFocused()) navigation.navigate('MedicalEdit', { section: 'medical', values: data.medical });
    } catch {
      if (navigation.isFocused()) Alert.alert('Could not load medical information', 'Check your connection and try again.');
    } finally {
      setOpeningMedical(false);
    }
  }

  if (!medicalAlert && reminders.length === 0) return null;

  return <ScrollView style={style}>
    {(medicalAlert ? [medicalAlert, ...reminders] : reminders).map(reminder => {
      const color = colors[reminder.severity] ?? colors.text;
      const showTitle = !reminder.kind || reminder.kind === 'expiration';
      return (
        <View key={reminder.id ?? 'medical'} style={styles.row}>
          <AppText color={color} style={styles.message}>
            {showTitle && <AppText weight="600" color={color}>{reminder.title}{'\n'}</AppText>}
            {reminder.message}
          </AppText>
          {reminder === medicalAlert && <PlatformActionButton title="Update" variant="text" style={styles.dismiss}
            accessibilityLabel="Update medical certificate" disabled={openingMedical} onPress={updateMedical} />}
          {reminder.key && <PlatformActionButton title="Dismiss" variant="text" style={styles.dismiss}
            accessibilityLabel={`Dismiss ${showTitle ? reminder.title : reminder.message}`}
            disabled={dismissing} onPress={() => dismiss(reminder)} />}
        </View>
      );
    })}
  </ScrollView>;
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  message: { flex: 1 },
  dismiss: { paddingHorizontal: 0, minWidth: 48 },
});
