import React, { useCallback, useRef, useState } from 'react';
import { ActivityIndicator, Alert, Pressable, StyleSheet, View } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { SafeAreaView } from 'react-native-safe-area-context';
import api from '../api/axiosConfig';
import Text from '../components/AppText';
import Card from '../components/Card';
import { ScrollView } from '../components/OverflowLists';
import PlatformActionButton from '../components/PlatformActionButton';
import PrimaryActionButton from '../components/PrimaryActionButton';
import { useAppTheme } from '../theme/ThemeProvider';
import { reminderDateLabel, reminderKinds, remindersUrl } from './reminders';

export default function ManageRemindersScreen({ navigation }) {
  const { colors } = useAppTheme();
  const [reminders, setReminders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadFailed, setLoadFailed] = useState(false);
  const [retry, setRetry] = useState(0);
  const [removing, setRemoving] = useState(false);
  const [choosingKind, setChoosingKind] = useState(false);
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
    Alert.alert('Remove reminder?', reminder.kind === 'expiration' ? reminder.title : reminder.progress_label ?? reminder.goal_label, [
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
      {ready && !choosingKind && reminders.length === 0 && <Card><Text color={colors.muted}>No saved reminders yet.</Text></Card>}
      {ready && !choosingKind && reminders.map(reminder => <Card compact key={reminder.id}>
        {reminder.kind === 'expiration' && <Text weight="600">{reminder.title}</Text>}
        <Text color={colors.muted}>{reminder.kind === 'expiration' ? `Due ${reminderDateLabel(reminder.due_date)}`
          : reminder.progress_label ?? reminder.goal_label ?? `${reminder.target_hours} total flight hours`}</Text>
        {reminder.kind === 'company_time' && reminder.company_start_date && <Text color={colors.muted}>
          {reminderDateLabel(reminder.company_start_date)} – {reminder.company_end_date ? reminderDateLabel(reminder.company_end_date) : 'Present'}
        </Text>}
        <View style={styles.actions}>
          <PlatformActionButton title="Edit" variant="text" disabled={removing}
            accessibilityLabel={`Edit ${reminder.kind === 'expiration' ? reminder.title : reminder.progress_label ?? reminder.goal_label ?? reminder.title}`}
            onPress={() => navigation.navigate('EditReminder', { reminder })} />
          <PlatformActionButton title="Remove" variant="text" destructive disabled={removing}
            accessibilityLabel={`Remove ${reminder.kind === 'expiration' ? reminder.title : reminder.progress_label ?? reminder.goal_label ?? reminder.title}`}
            onPress={() => remove(reminder)} />
        </View>
      </Card>)}
      {ready && choosingKind && reminderKinds.map(([kind, label]) =>
        <Pressable key={kind} accessibilityRole="button" onPress={() => {
          setChoosingKind(false);
          navigation.navigate('EditReminder', { kind });
        }}>
          <Card style={styles.kindCard}><Text weight="600">{label}</Text></Card>
        </Pressable>)}
    </ScrollView>
    {ready && <View style={[styles.footer, { borderColor: colors.border }]}>
      <PrimaryActionButton title={choosingKind ? 'Cancel' : 'Add Reminder'} disabled={removing}
        onPress={() => setChoosingKind(previous => !previous)} />
    </View>}
  </SafeAreaView>;
}

const styles = StyleSheet.create({
  content: { padding: 12, gap: 8 },
  kindCard: { minHeight: 48, justifyContent: 'center' },
  actions: { flexDirection: 'row', justifyContent: 'flex-end', flexWrap: 'wrap' },
  footer: { paddingHorizontal: 12, paddingVertical: 8, borderTopWidth: 1 },
});
