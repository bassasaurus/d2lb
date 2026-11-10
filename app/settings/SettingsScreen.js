import { ScrollView } from '../components/OverflowLists';
import React from 'react';
import { Alert, Platform, Pressable, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
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
  const insets = useSafeAreaInsets();
  const version = formatAppVersion({
    projectVersion: Constants.expoConfig?.version,
    nativeVersion: Application.nativeApplicationVersion,
    buildVersion: Application.nativeBuildVersion,
    expoGo: isRunningInExpoGo(),
    development: __DEV__,
  });
  const choices = [['system', 'System'], ['light', 'Light'], ['dark', 'Dark']];
  return <ScrollView style={{ backgroundColor: colors.background }}
    contentContainerStyle={{ padding: 12, paddingBottom: 12 + (Platform.OS === 'android' ? insets.bottom : 0), flexGrow: 1 }}>
    <Text accessibilityRole="header" size={18} weight="600" style={{ marginBottom: 12 }}>Appearance</Text>
    <View style={{ flexDirection: 'row', gap: 8, marginBottom: 8 }}>
      {choices.map(([key, label]) => {
        const selected = preference === key;
        return <Pressable key={key} accessibilityRole="radio"
          accessibilityState={{ checked: selected, disabled: saving }} disabled={saving}
          onPress={() => setPreference(key).catch(() => Alert.alert('Appearance not saved', 'Please try again. Your previous setting is unchanged.'))}
          style={{ flex: 1, minHeight: 48, paddingHorizontal: 4, paddingVertical: 8, borderWidth: 1, borderRadius: 10,
            alignItems: 'center', justifyContent: 'center', borderColor: selected ? colors.primary : colors.border,
            backgroundColor: selected ? colors.selected : colors.surface }}>
          <Text size={17} weight="600" style={{ textAlign: 'center' }}>{label}</Text>
        </Pressable>;
      })}
    </View>
    <SyncSettings navigation={navigation} />
    <View style={{ marginTop: 'auto', paddingTop: 8 }}>
      <Card compact style={{ marginBottom: 4, paddingVertical: 4 }}>
        <PlatformActionButton title="Contact Support" variant="text" onPress={() => openContactEmail()} />
      </Card>
      <Card compact style={{ paddingVertical: 4 }}>
        <PlatformActionButton title="Privacy Policy" variant="text" onPress={() =>
          navigation.navigate('PrivacyPolicy')} />
      </Card>
    </View>
    <View style={{ paddingTop: 8 }}>
      <Text size={14} color={colors.muted} style={{ textAlign: 'center' }}>Version {version}</Text>
    </View>
  </ScrollView>;
}
