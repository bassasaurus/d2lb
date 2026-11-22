import AnimatedRemoval from '../components/AnimatedRemoval';
import { resetReminderPreferences, reminderCache } from './reminderStorage';
import { flightScope } from '../storage/flights';
import useReminderData from './useReminderData';
import ReminderFreshness from './ReminderFreshness';
import useReminderSnoozes from './useReminderSnoozes';
import SnoozeStatus, { ShowNowAction } from './SnoozeStatus';
import ReminderSection from '../components/ReminderSection';
import useProfile from '../profile/useProfile';
import ReminderBanner from '../components/ReminderBanner';
import { orderedReminders, reminderTone, reminderGroups, isMilestone } from './reminderPresentation.mjs';
import MedicalCertificateCard from './MedicalCertificateCard';
import React, { useRef, useState } from 'react';
import { ActivityIndicator, Alert, Pressable, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import api from '../api/axiosConfig';
import Text from '../components/AppText';
import Card from '../components/Card';
import { ScrollView } from '../components/OverflowLists';
import PlatformActionButton from '../components/PlatformActionButton';
import PrimaryActionButton from '../components/PrimaryActionButton';
import { useAppTheme } from '../theme/ThemeProvider';
import { reminderDateLabel, reminderKinds, reminderTypeDescriptions, remindersUrl } from './reminders';

export default function ManageRemindersScreen({ navigation, route }) {
  const { colors, isDark } = useAppTheme();
  const profileState = useProfile();
  const snoozes = useReminderSnoozes();
  const manageState = useReminderData('manage');
  const alertState = useReminderData('alerts');
  const alerts = alertState.data || {};
  const regulatoryRows = alerts.regulatory_alerts || [...(alerts.reminders || []), ...(alerts.instrument_alerts || [])];
  const alertFor = reminder => regulatoryRows.find(row => row.id === reminder.id) || reminder;
  const activeGroup = route.params?.group === 'milestones' ? 'milestones' : 'regulatory';
  const [pendingRemoval, setPendingRemoval] = useState(null);
  const reminders = pendingRemoval?.rows || manageState.data?.reminders || [];
  const loading = manageState.loading && !manageState.data;
  const loadFailed = manageState.offline && !manageState.data;
  const [removing, setRemoving] = useState(false);
  const [choosingKind, setChoosingKind] = useState(null);
  const removalInProgress = useRef(false);

  function remove(reminder) {
    const label = ['expiration', 'flight_review', 'instructor_renewal', 'ipc'].includes(reminder.kind) ? 'reminder' : 'milestone';
    Alert.alert(`Remove ${label}?`, 'Remove it from your account? Its alert will be removed from all devices after sync.', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Remove', style: 'destructive', onPress: async () => {
        if (removalInProgress.current) return;
        removalInProgress.current = true;
        setRemoving(true);
        let animating = false;
        try {
          const scope = await flightScope();
          await api.delete(`${remindersUrl}${reminder.id}/`);
          if (await flightScope() !== scope) return;
          const pending = { id: reminder.id, rows: reminders, ready: false };
          setPendingRemoval(pending);
          await manageState.replace({ reminders: reminders.filter(item => item.id !== reminder.id) });
          await alertState.replace({ reminders: (alerts.reminders || []).filter(item => item.id !== reminder.id) });
          // Deletion already succeeded; disk cleanup must not report it as a failed removal.
          try {
            await resetReminderPreferences(reminder.id);
            await reminderCache.remove(scope, reminder.id);
          } catch { /* Fresh server responses remain authoritative. */ }
          animating = true;
          setPendingRemoval({ ...pending, ready: true });
          alertState.refresh();
        } catch (error) {
          setPendingRemoval(null);
          if (error.response?.status === 404) {
            manageState.refresh();
          } else {
            Alert.alert('Could not remove reminder', 'Check your connection and try again.');
          }
        } finally {
          if (!animating) {
            removalInProgress.current = false;
            setRemoving(false);
          }
        }
      } },
    ]);
  }

  async function restore(reminder) {
    if (removalInProgress.current) return;
    removalInProgress.current = true;
    setRemoving(true);
    try {
      const scope = await flightScope();
      const { data } = await api.post(`${remindersUrl}${reminder.id}/restore/`);
      await resetReminderPreferences(reminder.id);
      const { data: freshAlerts } = await api.get('/api/mobile/reminders/');
      if (await flightScope() !== scope) return;
      await reminderCache.write(scope, 'alerts', freshAlerts);
      await manageState.replace({ reminders: reminders.map(item => item.id === reminder.id ? data : item) });
      alertState.refresh();
    } catch {
      Alert.alert('Could not restore reminder', 'Check your connection and try again.');
    } finally {
      removalInProgress.current = false;
      setRemoving(false);
    }
  }

  const ready = !loading && !loadFailed;
  const cards = orderedReminders(ready ? reminders : []);
  return <SafeAreaView edges={['left', 'right', 'bottom']} style={{ flex: 1, backgroundColor: colors.background }}>
    <ScrollView contentContainerStyle={styles.content}>
      <ReminderFreshness state={manageState.offline || manageState.cached ? manageState : alertState} />
      {!choosingKind && activeGroup === 'regulatory' && <MedicalCertificateCard navigation={navigation} profileState={profileState} snoozes={snoozes} medicalAlert={alerts.medical_alert} />}
      {loading && <ActivityIndicator color={colors.primary} accessibilityLabel="Loading reminders" />}
      {loadFailed && <Card>
        <Text>Couldn’t load reminders. Check your connection and try again.</Text>
        <PlatformActionButton title="Try Again" variant="text" onPress={manageState.refresh} />
      </Card>}
      {!choosingKind && activeGroup === 'regulatory' && (alerts.regulatory_alerts ? alerts.regulatory_alerts.filter(item => typeof item.id === 'string') : alerts.instrument_alerts ?? (alerts.instrument_alert ? [alerts.instrument_alert] : [])).filter(item => snoozes.until(item) || snoozes.dismissed(item)).map(item => <Card key={item.id}>
        <Text weight="600">{item.title || 'IFR'}</Text>
        <Text>{item.message}</Text>
        <SnoozeStatus reminder={item} snoozes={snoozes} />
      </Card>)}
      {ready && !choosingKind && activeGroup === 'milestones' && reminderGroups(reminders)[1].rows.length === 0 && <Card><Text color={colors.muted}>No milestones yet.</Text></Card>}
      {!choosingKind && reminderGroups(cards).filter(group => group.key === activeGroup).map(group => <ReminderSection showAll key={group.key} group={group} renderRow={reminder => <AnimatedRemoval key={reminder.id}
        removing={pendingRemoval?.id === reminder.id && pendingRemoval.ready}
        onRemoved={() => { setPendingRemoval(null); removalInProgress.current = false; setRemoving(false); }}>
        <ReminderBanner compact severity={reminder.severity} milestoneState={reminder.milestone_state} plain={reminder.banner === false}>
        {['expiration', 'flight_review', 'instructor_renewal', 'ipc'].includes(reminder.kind) && <Text color={reminderTone(reminder.severity, isDark, colors, reminder.banner === false, reminder.milestone_state).text} weight="600">{reminder.title}</Text>}
        <Text color={reminderTone(reminder.severity, isDark, colors, reminder.banner === false, reminder.milestone_state).text}>{reminder.status_message || (['expiration', 'flight_review', 'instructor_renewal', 'ipc'].includes(reminder.kind) ? `${reminder.kind === 'ipc' ? 'Review IFR by' : 'Review by'} ${reminderDateLabel(reminder.due_date)}`
          : reminder.progress_label ?? reminder.goal_label ?? `${reminder.target_hours} total flight hours`)}</Text>
        {!!reminder.holding_warning && <Text color={colors.danger}>{reminder.holding_warning}</Text>}
        {reminder.kind === 'flight_review' && <Text color={colors.muted}>
          {reminderDateLabel(reminder.last_qualifying_date)} — {reminder.completion_type_label}
        </Text>}
        {reminder.kind === 'company_time' && reminder.company_start_date && <Text color={colors.muted}>
          {reminderDateLabel(reminder.company_start_date)} – {reminder.company_end_date ? reminderDateLabel(reminder.company_end_date) : 'Present'}
        </Text>}
        {isMilestone(reminder) && reminder.dismissed && <Text color={reminderTone(reminder.severity, isDark, colors, reminder.banner === false, reminder.milestone_state).text}>Dismissed</Text>}
        {!isMilestone(reminder) && <SnoozeStatus reminder={alertFor(reminder)} snoozes={snoozes} showAction={false} />}
        <View style={styles.actions}>
          {!isMilestone(reminder) && <ShowNowAction reminder={alertFor(reminder)} snoozes={snoozes}
            style={{ marginRight: 'auto', paddingLeft: 0 }} />}
          {isMilestone(reminder) && reminder.dismissed === true && <View style={{ marginRight: 'auto' }}><PlatformActionButton title="Restore" variant="text" disabled={removing}
            accessibilityLabel={`Restore ${['expiration', 'flight_review', 'instructor_renewal', 'ipc'].includes(reminder.kind) ? reminder.title : reminder.progress_label ?? reminder.goal_label}`}
            onPress={() => restore(reminder)} /></View>}
          <PlatformActionButton title="Edit" variant="text" disabled={removing}
            accessibilityLabel={`Edit ${['expiration', 'flight_review', 'instructor_renewal', 'ipc'].includes(reminder.kind) ? reminder.title : reminder.progress_label ?? reminder.goal_label ?? reminder.title}`}
            onPress={() => navigation.navigate('EditReminder', { reminder })} />
          <PlatformActionButton title="Remove" variant="text" destructive disabled={removing}
            accessibilityLabel={`Remove ${['expiration', 'flight_review', 'instructor_renewal', 'ipc'].includes(reminder.kind) ? reminder.title : reminder.progress_label ?? reminder.goal_label ?? reminder.title}`}
            onPress={() => remove(reminder)} />
        </View>
      </ReminderBanner></AnimatedRemoval>} />)}
      {ready && choosingKind && reminderKinds.filter(([kind]) => ['expiration', 'flight_review', 'instructor_renewal', 'ipc'].includes(kind) === (choosingKind === 'regulatory')).map(([kind, label]) =>
        <Pressable key={kind} accessibilityRole="button" onPress={() => {
          setChoosingKind(false);
          const existing = ['flight_review', 'instructor_renewal'].includes(kind) ? reminders.find(item => item.kind === kind) : null;
          navigation.navigate('EditReminder', existing ? { reminder: existing } : { kind });
        }}>
          <Card style={styles.kindCard}><Text weight="600">{label}</Text>{reminderTypeDescriptions[kind] && <Text color={colors.muted}>{reminderTypeDescriptions[kind]}</Text>}</Card>
        </Pressable>)}
    </ScrollView>
    {ready && <View style={[styles.footer, { borderColor: colors.border }]}>
{choosingKind ? <PrimaryActionButton title="Cancel" onPress={() => setChoosingKind(null)} /> : <>
        <PrimaryActionButton title={activeGroup === 'regulatory' ? 'Add Reminder' : 'Add Milestone'}
          disabled={removing} onPress={() => setChoosingKind(activeGroup)} />
      </>}
    </View>}
  </SafeAreaView>;
}

const styles = StyleSheet.create({
  content: { padding: 12, gap: 8 },
  kindCard: { minHeight: 48, justifyContent: 'center' },
  actions: { flexDirection: 'row', justifyContent: 'flex-end', flexWrap: 'wrap' },
  footer: { gap: 8, paddingHorizontal: 12, paddingVertical: 8, borderTopWidth: 1 },
});
