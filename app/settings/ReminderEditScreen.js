import FormKeyboardAvoidingView from '../components/FormKeyboardAvoidingView';
import React, { useEffect, useRef, useState } from 'react';
import { Alert, Platform, Pressable, StyleSheet } from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import { usePreventRemove } from '@react-navigation/native';
import api from '../api/axiosConfig';
import { completeReferenceRows } from '../api/referenceRows.mjs';
import Text from '../components/AppText';
import AppTextInput from '../components/AppTextInput';
import PlatformActionButton from '../components/PlatformActionButton';
import PrimaryActionButton from '../components/PrimaryActionButton';
import ScrollableFormCard from '../components/ScrollableFormCard';
import { useAppTheme } from '../theme/ThemeProvider';
import { crewPositions, reminderDateLabel, reminderKinds, remindersUrl } from './reminders';

function localDateValue(date) {
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${date.getFullYear()}-${month}-${day}`;
}

export default function ReminderEditScreen({ navigation, route }) {
  const { colors } = useAppTheme();
  const reminder = route.params?.reminder;
  const initialKind = reminder?.kind ?? route.params?.kind ?? 'expiration';
  const [title, setTitle] = useState(reminder?.title ?? '');
  const [kind, setKind] = useState(initialKind);
  const [dueDate, setDueDate] = useState(reminder?.due_date ?? '');
  const [targetHours, setTargetHours] = useState(reminder?.target_hours ?? '');
  const [aircraft, setAircraft] = useState(reminder?.aircraft ?? null);
  const [crewPosition, setCrewPosition] = useState(reminder?.crew_position ?? '');
  const [companyInput, setCompanyInput] = useState(reminder?.company);
  const [profileCompany, setProfileCompany] = useState(null);
  const [startDate, setStartDate] = useState(reminder?.company_start_date ?? '');
  const [endDate, setEndDate] = useState(reminder?.company_end_date ?? '');
  const [aircraftChoices, setAircraftChoices] = useState(null);
  const [aircraftLoadFailed, setAircraftLoadFailed] = useState(false);
  const [aircraftRetry, setAircraftRetry] = useState(0);
  const [showAircraft, setShowAircraft] = useState(false);
  const [datePicker, setDatePicker] = useState(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const saveInProgress = useRef(false);
  const saved = useRef(false);

  const expiration = kind === 'expiration';
  const crewMilestone = kind === 'crew_in_type';
  const typeMilestone = crewMilestone || kind === 'time_in_type';
  const companyMilestone = kind === 'company_time';
  const initialCompany = reminder ? reminder.company ?? '' : profileCompany ?? '';
  const company = companyInput ?? initialCompany;
  const invalidPeriod = Boolean(startDate && endDate && endDate < startDate);
  const selectedAircraft = aircraftChoices?.find(row => row.id === aircraft);
  const dirty = (expiration && title !== (reminder?.title ?? '')) || kind !== initialKind ||
    (expiration ? dueDate !== (reminder?.due_date ?? '') : targetHours !== (reminder?.target_hours ?? '')) ||
    (typeMilestone && aircraft !== (reminder?.aircraft ?? null)) ||
    (crewMilestone && crewPosition !== (reminder?.crew_position ?? '')) ||
    (companyMilestone && (company !== initialCompany ||
      startDate !== (reminder?.company_start_date ?? '') || endDate !== (reminder?.company_end_date ?? '')));

  useEffect(() => {
    if (!typeMilestone) return;
    const controller = new AbortController();
    setAircraftLoadFailed(false);
    api.get('/api/aircraft/', { signal: controller.signal }).then(({ data }) => {
      if (!controller.signal.aborted) setAircraftChoices(completeReferenceRows(data));
    }).catch(() => {
      if (!controller.signal.aborted) setAircraftLoadFailed(true);
    });
    return () => controller.abort();
  }, [typeMilestone, aircraftRetry]);

  useEffect(() => {
    if (!companyMilestone || reminder || profileCompany !== null) return;
    const controller = new AbortController();
    api.get('/api/mobile/profile/', { signal: controller.signal }).then(({ data }) => {
      if (!controller.signal.aborted && typeof data.account?.company === 'string') {
        setProfileCompany(data.account.company.trim());
      }
    }).catch(() => {
      // The company can still be entered manually.
    });
    return () => controller.abort();
  }, [companyMilestone, reminder, profileCompany]);

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
      title: expiration ? title.trim() : '',
      kind,
      due_date: expiration ? dueDate : null,
      target_hours: expiration ? null : targetHours.trim().replace(',', '.'),
      aircraft: typeMilestone ? aircraft : null,
      crew_position: crewMilestone ? crewPosition : '',
      company: companyMilestone ? company.trim() : '',
      company_start_date: companyMilestone ? startDate : null,
      company_end_date: companyMilestone && endDate ? endDate : null,
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

  function dateInput(label, value, setValue, optional = false) {
    const open = datePicker === label;
    const pickerDate = value ? new Date(`${value}T12:00:00`) : new Date();
    return <>
      <Text weight="600" style={styles.heading}>{label}</Text>
      <PlatformActionButton title={value ? reminderDateLabel(value) : 'Select Date'}
        accessibilityLabel={value ? `${label}, ${reminderDateLabel(value)}` : `Select ${label}`}
        variant="text" disabled={saving} onPress={() => setDatePicker(label)} />
      {optional && value !== '' && <PlatformActionButton title="Clear End Date" variant="text" disabled={saving}
        onPress={() => { setValue(''); setDatePicker(null); }} />}
      {open && <DateTimePicker mode="date" display={Platform.OS === 'ios' ? 'inline' : 'default'}
        value={pickerDate}
        onChange={(event, date) => {
          if (Platform.OS !== 'ios') setDatePicker(null);
          if (event.type === 'set' && date) setValue(localDateValue(date));
        }} />}
      {open && Platform.OS === 'ios' && <PlatformActionButton title="Done" variant="text" onPress={() => {
        if (!value) setValue(localDateValue(pickerDate));
        setDatePicker(null);
      }} />}
    </>;
  }

  return <FormKeyboardAvoidingView style={{ flex: 1, backgroundColor: colors.background }}>
    <ScrollableFormCard footer={<PrimaryActionButton title={saving ? 'Saving…' : 'Save'} onPress={save}
      disabled={saving || (expiration ? !title.trim() || !dueDate : !targetHours.trim()) ||
        (typeMilestone && (!selectedAircraft || aircraftLoadFailed)) || (crewMilestone && !crewPosition) ||
        (companyMilestone && (!company.trim() || !startDate || invalidPeriod))} />}>
      {expiration && <>
        <Text weight="600">Title</Text>
        <AppTextInput accessibilityLabel="Title" placeholder="BFR, IPC, etc." maxLength={80} autoCapitalize="sentences"
          value={title} onChangeText={setTitle} isValid editable={!saving} />
      </>}
      <Text weight="600" style={styles.heading}>Reminder Type</Text>
      {reminderKinds.map(([key, label]) => <Pressable key={key} accessibilityRole="radio" disabled={saving}
        accessibilityState={{ checked: kind === key, disabled: saving }}
        style={[styles.choice, { borderColor: kind === key ? colors.primary : colors.border,
          backgroundColor: kind === key ? colors.selected : colors.surface }]}
        onPress={() => { setKind(key); setDatePicker(null); }}>
        <Text>{label}</Text>
        {kind === key && <Text color={colors.primary} accessible={false}>✓</Text>}
      </Pressable>)}
      {expiration ? dateInput('Due Date', dueDate, setDueDate) : <>
        {typeMilestone && <>
          <Text weight="600" style={styles.heading}>Aircraft Type</Text>
          {aircraftLoadFailed ? <>
            <Text color={colors.danger}>Couldn’t load aircraft.</Text>
            <PlatformActionButton title="Try Again" variant="text" onPress={() => setAircraftRetry(value => value + 1)} />
          </> : aircraftChoices === null ? <Text color={colors.muted}>Loading aircraft…</Text>
            : aircraftChoices.length === 0 ? <Text color={colors.muted}>Add an aircraft to your logbook first.</Text>
              : <>
                <PlatformActionButton title={selectedAircraft?.aircraft_type ?? 'Choose Aircraft Type'} variant="text"
                  disabled={saving} onPress={() => setShowAircraft(value => !value)} />
                {showAircraft && aircraftChoices.map(row => <PlatformActionButton key={row.id} title={row.aircraft_type}
                  variant="text" disabled={saving} onPress={() => { setAircraft(row.id); setShowAircraft(false); }} />)}
              </>}
        </>}
        {crewMilestone && <>
          <Text weight="600" style={styles.heading}>Crew Position</Text>
          {crewPositions.map(([key, label]) => <Pressable key={key} accessibilityRole="radio" disabled={saving}
            accessibilityState={{ checked: crewPosition === key, disabled: saving }}
            style={[styles.choice, { borderColor: crewPosition === key ? colors.primary : colors.border,
              backgroundColor: crewPosition === key ? colors.selected : colors.surface }]}
            onPress={() => setCrewPosition(key)}>
            <Text>{label}</Text>
            {crewPosition === key && <Text color={colors.primary} accessible={false}>✓</Text>}
          </Pressable>)}
        </>}
        {companyMilestone && <>
          <Text weight="600" style={styles.heading}>Company</Text>
          <AppTextInput accessibilityLabel="Company" placeholder="Enter company name"
            maxLength={50} autoCapitalize="words" value={company} onChangeText={setCompanyInput} isValid editable={!saving} />
          {profileCompany === '' && <Text color={colors.muted}>Add a company in your profile to prefill future milestones.</Text>}
          {dateInput('Start Date', startDate, setStartDate)}
          {dateInput('End Date (optional)', endDate, setEndDate, true)}
          <Text color={colors.muted}>All flights in this date range count. Leave the end date blank for an ongoing job.</Text>
          {invalidPeriod && <Text color={colors.danger}>End date must be on or after the start date.</Text>}
        </>}
        <Text weight="600" style={styles.heading}>Target Hours</Text>
        <AppTextInput accessibilityLabel="Target Hours" placeholder="500.0" keyboardType="decimal-pad"
          value={targetHours} onChangeText={setTargetHours} isValid editable={!saving} />
      </>}
      {error !== '' && <Text color={colors.danger} style={styles.heading} accessibilityLiveRegion="polite">{error}</Text>}
    </ScrollableFormCard>
  </FormKeyboardAvoidingView>;
}

const styles = StyleSheet.create({
  heading: { marginTop: 16 },
  choice: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: 12, paddingVertical: 10, marginTop: 8, borderRadius: 10, borderWidth: 1 },
});
