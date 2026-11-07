import { ScrollView } from '../components/OverflowLists';
import React from 'react';
import { Alert, Pressable, View } from 'react-native';
import Text from '../components/AppText';
import { useAppTheme } from './ThemeProvider';

export default function AppearanceScreen() {
  const { preference, scheme, colors, saving, setPreference } = useAppTheme();
  const choices = [
    ['system', 'System', 'Follow your phone’s light or dark appearance.'],
    ['light', 'Light', 'Always use the light appearance.'],
    ['dark', 'Dark', 'Use a dark background and softer colors.'],
  ];
  return <ScrollView style={{ backgroundColor: colors.background }} contentContainerStyle={{ padding: 12 }}>
    <Text style={{ marginBottom: 16 }}>Choose the appearance for this app.</Text>
    {choices.map(([key, label, description]) => <Pressable key={key} accessibilityRole="radio"
      accessibilityState={{ checked: preference === key, disabled: saving }} disabled={saving}
      onPress={() => setPreference(key).catch(() => Alert.alert('Appearance not saved', 'Please try again. Your previous setting is unchanged.'))}
      style={{ padding: 16, marginBottom: 12, borderWidth: 1, borderRadius: 10,
        borderColor: preference === key ? colors.primary : colors.border,
        backgroundColor: preference === key ? colors.selected : colors.surface }}>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
        <Text size={17} weight="600">{label}</Text><Text color={colors.primary}>{preference === key ? '✓' : ''}</Text>
      </View>
      <Text color={colors.muted} style={{ marginTop: 6 }}>{description}</Text>
    </Pressable>)}
    <Text color={colors.muted} accessibilityLiveRegion="polite">{saving ? 'Saving appearance…' : `${scheme === 'dark' ? 'Dark' : 'Light'} appearance is active.`}</Text>
  </ScrollView>;
}
