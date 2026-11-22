import MedicalCertificateCard from '../settings/MedicalCertificateCard';
import { medicalVisible } from '../settings/medicalPreferences.mjs';
import { reminderConfirmation, reminderDestination } from '../settings/reminderActions.mjs';
import { reminderCache } from '../settings/reminderStorage';
import { flightScope } from '../storage/flights';
import useReminderData from '../settings/useReminderData';
import ReminderFreshness from '../settings/ReminderFreshness';
import useReminderSnoozes from '../settings/useReminderSnoozes';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import ReminderSection from './ReminderSection';
import ReminderBanner from './ReminderBanner';
import { logbookAlerts, isMilestone, reminderDeadline, reminderTone, reminderGroups } from '../settings/reminderPresentation.mjs';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { AccessibilityInfo, Alert, LayoutAnimation, Modal, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import api from '../api/axiosConfig';
import { useAppTheme } from '../theme/ThemeProvider';
import AppText from './AppText';
import PlatformActionButton from './PlatformActionButton';

export default function LogbookReminders({ refreshVersion, style, scrollable = true, onFeedback }) {
  const { colors, isDark } = useAppTheme();
  const navigation = useNavigation();
  const [expanded, setExpanded] = useState(true);
  const [snoozing, setSnoozing] = useState(null);
  const snoozes = useReminderSnoozes();
  const reminderState = useReminderData('alerts', refreshVersion);
  const reminders = reminderState.data?.regulatory_alerts
    ? [...reminderState.data.regulatory_alerts, ...(reminderState.data.reminders || []).filter(isMilestone)]
    : reminderState.data?.reminders || [];
  const instrumentAlerts = reminderState.data?.regulatory_alerts ? [] : reminderState.data?.instrument_alerts ?? (reminderState.data?.instrument_alert ? [reminderState.data.instrument_alert] : []);
  const medicalProfile = reminderState.data?.medical_card;
  const medicalAlert = medicalProfile ?? reminderState.data?.medical_alert;
  const [dismissing, setDismissing] = useState(false);
  const [openingMedical, setOpeningMedical] = useState(false);
  const revision = useRef(0);
  useFocusEffect(useCallback(() => () => { revision.current += 1; }, []));
  const changing = useRef(false);
  const reducedMotion = useRef(false);
  const [openingRecord, setOpeningRecord] = useState(false);
  useEffect(() => {
    let active = true;
    AccessibilityInfo.isReduceMotionEnabled().then(value => { if (active) reducedMotion.current = value; });
    const subscription = AccessibilityInfo.addEventListener('reduceMotionChanged', value => { reducedMotion.current = value; });
    return () => { active = false; subscription.remove(); };
  }, []);
  function feedback(value) {
    if (navigation.isFocused()) onFeedback?.(value);
  }
  function animateChange() {
    if (!reducedMotion.current) LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
  }
  async function openReminder(row) {
    if (openingRecord) return;
    setOpeningRecord(true);
    try {
      let destination = reminderDestination(row);
      if (!destination) {
        const scope = await flightScope();
        const cached = await reminderCache.read(scope, 'manage');
        destination = reminderDestination(row, cached?.data?.reminders || []);
        if (!destination) {
          const { data } = await api.get('/api/mobile/reminders/manage/');
          destination = reminderDestination(row, data.reminders);
        }
      }
      if (navigation.isFocused()) {
        if (destination) navigation.navigate(destination.name, destination.params);
        else Alert.alert('Reminder no longer available', 'Open Manage to refresh your reminders.');
      }
    } catch { Alert.alert('Could not open reminder', 'Connect to download this reminder’s details.'); }
    finally { setOpeningRecord(false); }
  }

  async function snooze(days) {
    if (changing.current) return;
    changing.current = true;
    const row = snoozing;
    try {
      await snoozes.snooze(row, days, animateChange);
      setSnoozing(null);
      feedback({ message: reminderConfirmation('snooze', days), undo: () => snoozes.showNow(row, animateChange) });
    } catch { Alert.alert('Could not snooze', 'Please try again.'); }
    finally { changing.current = false; }
  }

  async function dismiss(reminder) {
    if (changing.current) return;
    changing.current = true;
    setDismissing(true);
    const request = ++revision.current;
    try {
      if (!reminder.medical && !isMilestone(reminder)) {
        await snoozes.dismissIFR(reminder, animateChange);
        feedback({ message: reminder.severity === 'warning' ? 'Hidden until red.' : 'Hidden for 30 days.', undo: () => snoozes.showNow(reminder, animateChange) });
      } else if (reminder.severity === 'warning' && !isMilestone(reminder)) {
        await snoozes.dismissCaution(reminder, animateChange);
        feedback({ message: reminderConfirmation('caution'), durationMs: 3000, undo: () => snoozes.showNow(reminder, animateChange) });
      } else {
        const { data } = await api.post(`/api/mobile/reminders/${reminder.id}/dismiss/`, { key: reminder.key });
        if (revision.current === request) {
          await reminderState.replace(data, animateChange);
          feedback({ message: reminderConfirmation('milestone'), undo: async () => {
            await api.post(`/api/mobile/reminders/manage/${reminder.id}/restore/`);
            await reminderState.replace({ reminders: [...(data.reminders || []).filter(row => row.id !== reminder.id), reminder] }, animateChange);
          } });
        }
      }
    } catch {
      if (revision.current === request) Alert.alert('Reminder not dismissed', 'Try again when connected.');
    } finally { changing.current = false; setDismissing(false); }
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

  if (!medicalAlert && !instrumentAlerts.length && reminders.length === 0) return reminderState.data ? null : <ReminderFreshness state={reminderState} />;

  const rows = logbookAlerts([...instrumentAlerts, ...reminders], {}, snoozes.now).filter(row => isMilestone(row) || !snoozes.hidden(row));
  const medicalOpen = snoozes.medical.ready && medicalVisible(medicalAlert, snoozes.medical.preferenceFor(medicalAlert), snoozes.now);
  const Container = scrollable ? ScrollView : View;
  return <Container style={style}>
    <ReminderFreshness state={reminderState} />
    <Modal visible={!!snoozing} transparent animationType="fade" onRequestClose={() => setSnoozing(null)}>
      <View style={styles.modalBackdrop}>
        <View style={[styles.snoozeCard, { backgroundColor: colors.surface }]}>
          <AppText weight="600">Snooze for</AppText>
          {(snoozing?.medical ? [1, 3, 7, 14, 30] : [1, 3, 7, 14]).map(days => <PlatformActionButton key={days} title={`${days} ${days === 1 ? 'day' : 'days'}`}
            variant="text" onPress={() => snooze(days)} />)}
          <PlatformActionButton title="Cancel" variant="text" onPress={() => setSnoozing(null)} />
        </View>
      </View>
    </Modal>
    {medicalAlert && <>
      {medicalOpen && <>
        <MedicalCertificateCard navigation={navigation} profileState={{ profile: medicalProfile, refreshing: reminderState.loading, refresh: reminderState.refresh }}
          medicalAlert={medicalAlert} snoozes={snoozes}
          onSnooze={() => setSnoozing({ ...medicalAlert, medical: true })}
          onStageSnooze={() => snoozes.snoozeMedicalStage({ ...medicalAlert, medical: true }).catch(() => Alert.alert('Could not snooze medical certificate', 'Please try again.'))}
          onDismiss={() => dismiss({ ...medicalAlert, medical: true })} />
      </>}
    </>}
    {!!rows.length && <>
    <Pressable accessibilityRole="button" accessibilityLabel={`Reminders and milestones, ${rows.length} items`}
      accessibilityHint="Show or hide caution reminders, red reminders and completed milestones." accessibilityState={{ expanded }}
      onPress={() => setExpanded(value => !value)} style={styles.toggle}>
      <AppText weight="600" style={{ flex: 1 }}>Reminders &amp; Milestones ({rows.length})</AppText>
      <MaterialCommunityIcons name={expanded ? 'chevron-up' : 'chevron-down'} color={colors.primary} size={22} />
    </Pressable>
    {reminderGroups(expanded ? rows : []).map(group =>
      <ReminderSection showAll key={group.key} group={group} renderRow={reminder => {
      const plain = reminder.banner === false;
      const color = reminderTone(reminder.severity, isDark, colors, plain, reminder.milestone_state).text;
      const showTitle = !reminder.kind || ['expiration', 'flight_review', 'instructor_renewal', 'ipc'].includes(reminder.kind);
      return (
        <ReminderBanner key={reminder.id ?? 'medical'} severity={reminder.severity} milestoneState={reminder.milestone_state} plain={plain} style={styles.row}>
          <Pressable style={styles.message} accessibilityRole="button" disabled={openingRecord}
            accessibilityLabel={`Open ${showTitle ? reminder.title : reminder.progress_label || 'milestone'}`}
            onPress={() => openReminder(reminder)}>
          <AppText color={color}>
            {showTitle && <AppText weight="600" color={color}>{reminder.title}{'\n'}</AppText>}
            {reminder.progress_label ?? reminder.message}
            {!!reminderDeadline(reminder) && <AppText color={color}>{'\n'}{reminderDeadline(reminder)}</AppText>}
            {!!reminder.holding_warning && <AppText color={colors.danger}>{'\n'}{reminder.holding_warning}</AppText>}
          </AppText>
          </Pressable>
          {reminder.medical && <PlatformActionButton title="Update" variant="text" style={styles.dismiss}
            accessibilityLabel="Update medical certificate" disabled={openingMedical} onPress={updateMedical} />}
          {!isMilestone(reminder) && <PlatformActionButton title="Snooze" variant="text" style={styles.dismiss}
            accessibilityLabel={`Snooze ${reminder.title}`} disabled={!snoozes.ready} onPress={() => setSnoozing(reminder)} />}
          {(!isMilestone(reminder) || reminder.key) && <PlatformActionButton title="Dismiss" variant="text" style={styles.dismiss}
            accessibilityLabel={`Dismiss ${showTitle ? reminder.title : reminder.message}`}
            disabled={dismissing || !snoozes.ready} onPress={() => dismiss(reminder)} />}
          {reminder.severity === 'warning' && <AppText color={color} style={{ width: '100%', fontSize: 12 }}>Dismiss to hide until this reminder turns red.</AppText>}
        </ReminderBanner>
      );
    }} />)}
    </>}
  </Container>;
}

const styles = StyleSheet.create({
  modalBackdrop: { flex: 1, backgroundColor: '#0008', justifyContent: 'center', padding: 24 },
  snoozeCard: { padding: 16, borderRadius: 16, gap: 4 },
  toggle: { minHeight: 44, flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 8 },
  row: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 8, marginBottom: 4 },
  message: { flex: 1, textAlign: 'left' },
  dismiss: { paddingHorizontal: 0, minWidth: 48 },
});
