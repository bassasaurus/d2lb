import React, { useRef, useState } from 'react';
import { Alert, KeyboardAvoidingView, Platform, Pressable, StyleSheet } from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import { usePreventRemove } from '@react-navigation/native';
import api from '../api/axiosConfig';
import Text from '../components/AppText';
import AppTextInput from '../components/AppTextInput';
import PlatformActionButton from '../components/PlatformActionButton';
import PrimaryActionButton from '../components/PrimaryActionButton';
import ScrollableFormCard from '../components/ScrollableFormCard';
import { useAppTheme } from '../theme/ThemeProvider';
import { reminderDateLabel, remindersUrl } from './reminders';

const kinds = [['expiration', 'Expiration Date'], ['flight_time', 'Flight Time Milestone']];

function localDateValue(date) {
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${date.getFullYear()}-${month}-${day}`;
}

export default function ReminderEditScreen({ navigation, route }) {
  const { colors } = useAppTheme();
  const reminder = route.params?.reminder;
  const [title, setTitle] = useState(reminder?.title ?? '');
  const [kind, setKind] = useState(reminder?.kind ?? 'expiration');
  const [dueDate, setDueDate] = useState(reminder?.due_date ?? '');
  const [targetHours, setTargetHours] = useState(reminder?.target_hours ?? '');
  const [showDate, setShowDate] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const saveInProgress = useRef(false);
  const saved = useRef(false);

  const expiration = kind === 'expiration';
  const dirty = title !== (reminder?.title ?? '') || kind !== (reminder?.kind ?? 'expiration') ||
    (expiration ? dueDate !== (reminder?.due_date ?? '') : targetHours !== (reminder?.target_hours ?? ''));
  usePreventRemove(dirty || saving, ({ data }) => {
    if (saved.current) {
      navigation.dispatch(data.action);
    } else if (saveInProgress.current) {
      Alert.alert('Saving reminder', 'Please wait until the save finishes.');
    } else {
      Alert.alert('Discard changes?', 'Your edits to this reminder haven’t been saved.', [
        { text: 'Keep Editing', style: 'cancel' },
        { text: 'Discard', style: 'destructive', onPress: () => navigation.dispatch(data.action) },
      ]);
    }
  });

  async function save() {
    if (saveInProgress.current) return;
    saveInProgress.current = true;
    setSaving(true);
    setError('');
    const values = {
      title: title.trim(),
      kind,
      due_date: expiration ? dueDate : null,
      target_hours: expiration ? null : targetHours.trim().replace(',', '.'),
    };
    try {
      if (reminder) await api.put(`${remindersUrl}${reminder.id}/`, values);
      else await api.post(remindersUrl, values);
      saved.current = true;
      navigation.goBack();
    } catch (requestError) {
      const response = requestError.response;
      setError(response?.status === 400 && response.data
        ? Object.values(response.data).flat().join('\n')
        : response?.status === 404 && reminder
          ? 'This reminder is no longer available. Go back to refresh the list.'
          : 'Couldn’t save the reminder. Check your connection and try again.');
    } finally {
      saveInProgress.current = false;
      setSaving(false);
    }
  }

  return <KeyboardAvoidingView style={{ flex: 1, backgroundColor: colors.background }}
    behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
    <ScrollableFormCard footer={<PrimaryActionButton title={saving ? 'Saving…' : 'Save'} onPress={save}
      disabled={saving || !title.trim() || (expiration ? !dueDate : !targetHours.trim())} />}>
      <Text weight="600">Title</Text>
      <AppTextInput accessibilityLabel="Title" placeholder="BFR, IPC, etc." maxLength={80} autoCapitalize="sentences"
        value={title} onChangeText={setTitle} isValid editable={!saving} />
      <Text weight="600" style={styles.heading}>Reminder Type</Text>
      {kinds.map(([key, label]) => <Pressable key={key} accessibilityRole="radio" disabled={saving}
        accessibilityState={{ checked: kind === key, disabled: saving }}
        style={[styles.choice, { borderColor: kind === key ? colors.primary : colors.border,
          backgroundColor: kind === key ? colors.selected : colors.surface }]}
        onPress={() => { setKind(key); setShowDate(false); }}>
        <Text>{label}</Text>
        {kind === key && <Text color={colors.primary} accessible={false}>✓</Text>}
      </Pressable>)}
      {expiration ? <>
        <Text weight="600" style={styles.heading}>Due Date</Text>
        <PlatformActionButton title={dueDate ? reminderDateLabel(dueDate) : 'Select Date'} variant="text"
          disabled={saving} onPress={() => setShowDate(true)} />
        {showDate && <DateTimePicker mode="date" display={Platform.OS === 'ios' ? 'inline' : 'default'}
          value={dueDate ? new Date(`${dueDate}T12:00:00`) : new Date()}
          onChange={(event, date) => {
            setShowDate(Platform.OS === 'ios');
            if (event.type === 'set' && date) setDueDate(localDateValue(date));
          }} />}
        {showDate && Platform.OS === 'ios' && <PlatformActionButton title="Done" variant="text" onPress={() => {
          if (!dueDate) setDueDate(localDateValue(new Date()));
          setShowDate(false);
        }} />}
      </> : <>
        <Text weight="600" style={styles.heading}>Target Hours</Text>
        <AppTextInput accessibilityLabel="Target Hours" placeholder="500.0" keyboardType="decimal-pad"
          value={targetHours} onChangeText={setTargetHours} isValid editable={!saving} />
      </>}
      {error !== '' && <Text color={colors.danger} style={styles.heading} accessibilityLiveRegion="polite">{error}</Text>}
    </ScrollableFormCard>
  </KeyboardAvoidingView>;
}

const styles = StyleSheet.create({
  heading: { marginTop: 16 },
  choice: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: 12, paddingVertical: 10, marginTop: 8, borderRadius: 10, borderWidth: 1 },
});
