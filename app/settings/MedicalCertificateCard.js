import SnoozeStatus from './SnoozeStatus';
import React from 'react';
import { ActivityIndicator, View } from 'react-native';
import Card from '../components/Card';
import { reminderTone } from './reminderPresentation.mjs';
import Text from '../components/AppText';
import PlatformActionButton from '../components/PlatformActionButton';
import { useAppTheme } from '../theme/ThemeProvider';
import { profileDate } from '../profile/profileDate.mjs';

function Detail({ label, value, color }) {
  const { colors } = useAppTheme();
  return <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 16, paddingVertical: 5 }}>
    <Text color={color || colors.muted} style={{ flexShrink: 1, textAlign: 'left' }}>{label}</Text>
    <Text color={color} style={{ flexShrink: 1, marginLeft: 'auto', textAlign: 'right' }} selectable>{value}</Text>
  </View>;
}

export default function MedicalCertificateCard({ navigation, profileState, snoozes, medicalAlert }) {
  const { colors, isDark } = useAppTheme();
  const { profile, refreshing, message, refresh } = profileState;
  const tone = reminderTone(profile?.medical_severity, isDark, colors, profile?.medical_banner === false);
  const medical = profile?.medical;
  return <Card testID="medical-certificate-card">
    <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
      <Text size={18} weight="600" style={{ flexShrink: 1, textAlign: 'left' }}>Medical Certificate</Text>
      {medical && <PlatformActionButton title="Update" variant="text" style={{ paddingHorizontal: 0, minWidth: 0 }}
        accessibilityLabel="Update medical certificate"
        onPress={() => navigation.navigate('MedicalEdit', { section: 'medical', values: medical })} />}
    </View>
    {profile?.medical_missing && <Text color={tone.text}>Medical expiration date not recorded.</Text>}
    {medical ? <>
      <Detail label="Class" value={medical.first_class ? 'First Class' : medical.second_class ? 'Second Class' : medical.third_class ? 'Third Class' : 'Not recorded'} />
      <View style={{ borderRadius: 8,
        backgroundColor: profile.medical_banner ? tone.background : 'transparent' }}>
        <Detail color={tone.text} label="Expires" value={profileDate(profile.medical_due_date)} />
      </View>
      <Detail label="Issued" value={profileDate(medical.medical_issue_date)} />
      <Detail label="40 or older" value={medical.over_40 ? 'Yes' : 'No'} />
      {snoozes && <SnoozeStatus reminder={medicalAlert ? { ...medicalAlert, medical: true } : null} snoozes={snoozes} />}
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
