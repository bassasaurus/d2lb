import { medicalStageEnd } from './medicalPreferences.mjs';
import React, { useState } from 'react';
import { ActivityIndicator, Alert, Modal, View } from 'react-native';
import Card from '../components/Card';
import { reminderTone } from './reminderPresentation.mjs';
import Text from '../components/AppText';
import PlatformActionButton from '../components/PlatformActionButton';
import { useAppTheme } from '../theme/ThemeProvider';
import { reminderDateLabel } from './reminders';
const profileDate = value => value ? reminderDateLabel(value) : 'Not recorded';

function Detail({ label, value, color }) {
  const { colors } = useAppTheme();
  return <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 16, paddingVertical: 2 }}>
    <Text color={color || colors.muted} style={{ flexShrink: 1, textAlign: 'left' }}>{label}</Text>
    <Text color={color} style={{ flexShrink: 1, marginLeft: 'auto', textAlign: 'right' }} selectable>{value}</Text>
  </View>;
}

export default function MedicalCertificateCard({ navigation, profileState, snoozes, medicalAlert, onSnooze, onDismiss, onStageSnooze }) {
  const { colors, isDark } = useAppTheme();
  const { profile, refreshing, message, refresh } = profileState;
  const tone = reminderTone(profile?.medical_severity, isDark, colors);
  const medical = profile?.medical;
  const [choosingSnooze, setChoosingSnooze] = useState(false);
  const [savingSnooze, setSavingSnooze] = useState(false);
  const medicalRow = medicalAlert ? { ...medicalAlert, medical: true } : profile ? {
    medical: true, title: 'Medical Certificate', severity: profile.medical_severity,
    due_date: profile.medical_due_date,
  } : null;
  async function stageSnooze() {
    try { await snoozes.snoozeMedicalStage(medicalRow); }
    catch { Alert.alert('Could not snooze medical certificate', 'Please try again.'); }
  }
  async function snooze(days) {
    if (savingSnooze) return;
    setSavingSnooze(true);
    try {
      await snoozes.snooze(medicalRow, days);
      setChoosingSnooze(false);
    } catch { Alert.alert('Could not snooze medical certificate', 'Please try again.'); }
    finally { setSavingSnooze(false); }
  }
  return <Card compact testID="medical-certificate-card">
    <Modal visible={choosingSnooze} transparent animationType="fade" onRequestClose={() => setChoosingSnooze(false)}>
      <View style={{ flex: 1, backgroundColor: '#0008', justifyContent: 'center', padding: 24 }}>
        <View style={{ padding: 16, borderRadius: 16, gap: 4, backgroundColor: colors.surface }}>
          <Text weight="600">Snooze Medical Certificate</Text>
          {[1, 3, 7, 14, 30].map(days => <PlatformActionButton key={days}
            title={`${days} ${days === 1 ? 'day' : 'days'}`} variant="text"
            disabled={savingSnooze} onPress={() => snooze(days)} />)}
          <PlatformActionButton title="Cancel" variant="text" disabled={savingSnooze} onPress={() => setChoosingSnooze(false)} />
        </View>
      </View>
    </Modal>
    <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
      <Text size={18} weight="600" style={{ flexShrink: 1, textAlign: 'left' }}>Medical Certificate</Text>
      {medical && <PlatformActionButton title="Update" variant="text" style={{ paddingHorizontal: 0, minWidth: 0 }}
        accessibilityLabel="Update medical certificate"
        onPress={() => navigation.navigate('MedicalEdit', { section: 'medical', values: medical })} />}
    </View>
    {profile?.medical_missing && <Text color={tone.text}>Medical expiration date not recorded.</Text>}
    {medical ? <>
      <Detail label="Class" value={medical.first_class ? 'First Class' : medical.second_class ? 'Second Class' : medical.third_class ? 'Third Class' : 'Not recorded'} />
      <Text>{medical.over_40 ? '40 or older' : 'Under 40'} at examination</Text>
      <Detail label="Issued" value={profileDate(medical.medical_issue_date)} />
      <View style={{ borderRadius: 8,
        backgroundColor: tone.background }}>
        <Detail color={tone.text} label={(profile.medical_days_remaining ?? profile.days_remaining) < 0 ? 'Was due by' : 'Due by'} value={profileDate(profile.medical_due_date)} />
      </View>
      {snoozes && onSnooze && <View style={{ flexDirection: 'row', justifyContent: 'space-between', gap: 8 }}>
        <PlatformActionButton title="Snooze" variant="text" style={{ paddingHorizontal: 0, minWidth: 0, marginRight: 'auto', justifyContent: 'flex-start' }} disabled={!snoozes?.medical.ready} accessibilityLabel={medicalStageEnd(medicalRow) ? `Snooze medical certificate until ${medicalRow.severity === 'success' ? 'yellow' : 'red'}` : 'Snooze medical certificate'} onPress={medicalStageEnd(medicalRow) ? (onStageSnooze || stageSnooze) : (onSnooze || (() => setChoosingSnooze(true)))} />
        {onDismiss && profile.medical_severity === 'warning' && <PlatformActionButton title="Dismiss" variant="text" disabled={!snoozes?.medical.ready} onPress={onDismiss} />}
      </View>}
      {medicalStageEnd({ ...medicalRow, severity: 'success' }) && <Text color={colors.muted}>
        Next Alert on {profileDate(medicalStageEnd({ ...medicalRow, severity: 'success' }))}
      </Text>}
      {!!message && <>
        <Text color={colors.danger} accessibilityLiveRegion="polite">{message}</Text>
        <PlatformActionButton title="Try Again" variant="text" onPress={refresh} />
      </>}
    </> : refreshing ? <ActivityIndicator color={colors.primary} accessibilityLabel="Loading medical information" /> : <>
      <Text color={colors.danger} accessibilityLiveRegion="polite">Could not load medical information. Check your connection and try again.</Text>
      <PlatformActionButton title="Try Again" variant="text" onPress={refresh} />
    </>}
  </Card>;
}
