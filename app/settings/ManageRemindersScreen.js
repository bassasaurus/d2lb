import React, { useCallback, useRef, useState } from 'react';
import { ActivityIndicator, Alert, StyleSheet, View } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { SafeAreaView } from 'react-native-safe-area-context';
import api from '../api/axiosConfig';
import Text from '../components/AppText';
import Card from '../components/Card';
import { ScrollView } from '../components/OverflowLists';
import PlatformActionButton from '../components/PlatformActionButton';
import PrimaryActionButton from '../components/PrimaryActionButton';
import { useAppTheme } from '../theme/ThemeProvider';
import { reminderDateLabel, remindersUrl } from './reminders';

export default function ManageRemindersScreen({ navigation }) {
  const { colors } = useAppTheme();
  const [reminders, setReminders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadFailed, setLoadFailed] = useState(false);
  const [retry, setRetry] = useState(0);
  const [removing, setRemoving] = useState(false);
  const removalInProgress = useRef(false);

  useFocusEffect(useCallback(() => {
    let active = true;
    setLoading(true);
    setLoadFailed(false);
    api.get(remindersUrl).then(({ data }) => {
      if (active) setReminders(data.reminders);
    }).catch(() => {
      if (active) setLoadFailed(true);
    }).finally(() => {
      if (active) setLoading(false);
    });
    return () => { active = false; };
  }, [retry]));

  function remove(reminder) {
    Alert.alert('Remove reminder?', reminder.title, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Remove', style: 'destructive', onPress: async () => {
        if (removalInProgress.current) return;
        removalInProgress.current = true;
        setRemoving(true);
        try {
          await api.delete(`${remindersUrl}${reminder.id}/`);
          setReminders(previous => previous.filter(item => item.id !== reminder.id));
        } catch (error) {
          if (error.response?.status === 404) {
            setRetry(previous => previous + 1);
          } else {
            Alert.alert('Could not remove reminder', 'Check your connection and try again.');
          }
        } finally {
          removalInProgress.current = false;
          setRemoving(false);
        }
      } },
    ]);
  }

  const ready = !loading && !loadFailed;
  return <SafeAreaView edges={['left', 'right', 'bottom']} style={{ flex: 1, backgroundColor: colors.background }}>
    <ScrollView contentContainerStyle={styles.content}>
      {loading && <ActivityIndicator color={colors.primary} accessibilityLabel="Loading reminders" />}
      {loadFailed && <Card>
        <Text>Couldn’t load reminders. Check your connection and try again.</Text>
        <PlatformActionButton title="Try Again" variant="text" onPress={() => setRetry(previous => previous + 1)} />
      </Card>}
      {ready && reminders.length === 0 && <Card><Text color={colors.muted}>No saved reminders yet.</Text></Card>}
      {ready && reminders.map(reminder => <Card compact key={reminder.id}>
        <Text weight="600">{reminder.title}</Text>
        <Text color={colors.muted}>{reminder.kind === 'flight_time' ? `${reminder.target_hours} total flight hours`
          : `Due ${reminderDateLabel(reminder.due_date)}`}</Text>
        <View style={styles.actions}>
          <PlatformActionButton title="Edit" variant="text" disabled={removing}
            accessibilityLabel={`Edit ${reminder.title}`} onPress={() => navigation.navigate('EditReminder', { reminder })} />
          <PlatformActionButton title="Remove" variant="text" destructive disabled={removing}
            accessibilityLabel={`Remove ${reminder.title}`} onPress={() => remove(reminder)} />
        </View>
      </Card>)}
    </ScrollView>
    {ready && <View style={[styles.footer, { borderColor: colors.border }]}>
      <PrimaryActionButton title="Add Reminder" disabled={removing} onPress={() => navigation.navigate('EditReminder')} />
    </View>}
  </SafeAreaView>;
}

const styles = StyleSheet.create({
  content: { padding: 12, gap: 8 },
  actions: { flexDirection: 'row', justifyContent: 'flex-end', flexWrap: 'wrap' },
  footer: { paddingHorizontal: 12, paddingVertical: 8, borderTopWidth: 1 },
});
