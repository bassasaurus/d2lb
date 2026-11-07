import { ScrollView } from '../components/OverflowLists';
import React from 'react';
import { Alert, Pressable, View } from 'react-native';
import Constants from 'expo-constants';
import * as Application from 'expo-application';
import { isRunningInExpoGo } from 'expo';
import Text from '../components/AppText';
import Card from '../components/Card';
import PlatformActionButton from '../components/PlatformActionButton';
import { useAppTheme } from '../theme/ThemeProvider';
import SyncSettings from './SyncSettings';
import { openContactEmail } from './contactEmail';
import { formatAppVersion } from './appVersion.mjs';

export default function SettingsScreen({ navigation }) {
  const { preference, colors, saving, setPreference } = useAppTheme();
  const version = formatAppVersion({
    projectVersion: Constants.expoConfig?.version,
    nativeVersion: Application.nativeApplicationVersion,
    buildVersion: Application.nativeBuildVersion,
    expoGo: isRunningInExpoGo(),
    development: __DEV__,
  });
  const choices = [
    ['system', 'System', 'Follow your phone’s light or dark appearance.'],
    ['light', 'Light', 'Always use the light appearance.'],
    ['dark', 'Dark', 'Use a dark background and softer colors.'],
  ];
  return <ScrollView style={{ backgroundColor: colors.background }} contentContainerStyle={{ padding: 12 }}>
    <Text accessibilityRole="header" size={18} weight="600" style={{ marginBottom: 12 }}>Appearance</Text>
    {choices.map(([key, label, description]) => <Pressable key={key} accessibilityRole="radio"
      accessibilityState={{ checked: preference === key, disabled: saving }} disabled={saving}
      onPress={() => setPreference(key).catch(() => Alert.alert('Appearance not saved', 'Please try again. Your previous setting is unchanged.'))}
      style={{ paddingHorizontal: 12, paddingVertical: 8, marginBottom: 8, borderWidth: 1, borderRadius: 10,
        borderColor: preference === key ? colors.primary : colors.border,
        backgroundColor: preference === key ? colors.selected : colors.surface }}>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
        <Text size={17} weight="600">{label}</Text><Text color={colors.primary}>{preference === key ? '✓' : ''}</Text>
      </View>
      <Text color={colors.muted} style={{ marginTop: 4 }}>{description}</Text>
    </Pressable>)}
    {saving && <Text color={colors.muted} accessibilityLiveRegion="polite">Saving appearance…</Text>}
    <SyncSettings />
    <View style={{ marginTop: 12 }}>
      <Text accessibilityRole="header" size={18} weight="600" style={{ marginBottom: 12 }}>About</Text>
      <Card compact>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
          <Text>App version</Text>
          <Text color={colors.muted} style={{ flexShrink: 1, marginLeft: 12, textAlign: 'right' }}>{version}</Text>
        </View>
        <PlatformActionButton title="Contact Support" variant="text" onPress={() => openContactEmail()} />
        <View style={{ height: 1, backgroundColor: colors.border }} />
        <PlatformActionButton title="Privacy Policy" variant="text" onPress={() =>
          navigation.navigate('PrivacyPolicy')} />
      </Card>
    </View>
  </ScrollView>;
}
