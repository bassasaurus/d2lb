import PrimaryActionButton from '../components/PrimaryActionButton';
import React, { useRef, useState } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, Switch, View } from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import * as yup from 'yup';
import ScrollableFormCard from '../components/ScrollableFormCard';
import Text from '../components/AppText';
import AppTextInput from '../components/AppTextInput';
import PlatformActionButton from '../components/PlatformActionButton';
import DraftForm from '../drafts/DraftForm';
import { useAppTheme } from '../theme/ThemeProvider';
import api from '../api/axiosConfig';
import { profileDate } from './ProfileScreen';

export default function ProfileEditScreen({ route, navigation }) {
  const { section, values: initialValues } = route.params;
  const { colors } = useAppTheme();
  const draftHandle = useRef(null);
  const savedNavigation = useRef(false);
  const [showDate, setShowDate] = useState(false);
  const medical = section === 'medical';
  const schema = medical ? yup.object({ medical_issue_date: yup.string().required('Select an issue date.') })
    : yup.object({ first_name: yup.string().max(150), last_name: yup.string().max(150), company: yup.string().max(50) });
  return <KeyboardAvoidingView style={{ flex: 1, backgroundColor: colors.background }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
    <DraftForm kind={`profile-${section}`} initialValues={initialValues} validationSchema={schema}
      draftHandle={draftHandle} savedNavigation={savedNavigation}
      renderLayout={({ content, form: { handleSubmit, isSubmitting }, draftBlocked }) => (
        <ScrollableFormCard footer={<PrimaryActionButton title="Save" disabled={draftBlocked || isSubmitting} onPress={handleSubmit} />}>
          {content}
        </ScrollableFormCard>
      )}
      onSubmit={async (values, helpers) => {
          try {
            await api.patch('/api/mobile/profile/', { [section]: values });
            await draftHandle.current.complete();
            savedNavigation.current = true;
            helpers.resetForm({ values });
            navigation.goBack();
          } catch (error) {
            const detail = error.response?.data;
            helpers.setStatus(error.response?.status === 400 ? Object.values(detail).flat().join('\n')
              : 'Could not save to the server. Check your connection and retry. Your draft remains on this device.');
          } finally { helpers.setSubmitting(false); }
        }}>
        {({ values, setFieldValue, errors, status }) => <>
          {medical ? <>
            <Text weight="600">Issue date</Text>
            <PlatformActionButton title={profileDate(values.medical_issue_date)} variant="text" onPress={() => setShowDate(true)} />
            {showDate && <DateTimePicker value={new Date(`${values.medical_issue_date}T12:00:00`)} mode="date"
              onChange={(event, date) => {
                setShowDate(Platform.OS === 'ios');
                if (date) setFieldValue('medical_issue_date', `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`);
              }} />}
            <Text weight="600" style={{ marginTop: 12 }}>Class</Text>
            {[[null, 'Not recorded'], ['first_class', 'First Class'], ['second_class', 'Second Class'], ['third_class', 'Third Class']].map(([key, label]) => <Pressable key={label} accessibilityRole="radio"
              accessibilityState={{ checked: key ? values[key] : !values.first_class && !values.second_class && !values.third_class }}
              onPress={() => ['first_class', 'second_class', 'third_class'].forEach(field => setFieldValue(field, field === key))}
              style={{ paddingVertical: 12, flexDirection: 'row', justifyContent: 'space-between' }}>
              <Text>{label}</Text><Text color={colors.primary}>{(key ? values[key] : !values.first_class && !values.second_class && !values.third_class) ? '✓' : ''}</Text>
            </Pressable>)}
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginVertical: 12 }}>
              <Text>Over 40</Text><Switch accessibilityLabel="Over 40" value={values.over_40} onValueChange={value => setFieldValue('over_40', value)} />
            </View>
          </> : [['first_name', 'First name'], ['last_name', 'Last name'], ['company', 'Company']].map(([key, label]) => <View key={key} style={{ marginBottom: 12 }}>
            <Text>{label}</Text><AppTextInput accessibilityLabel={label} placeholder={label} value={values[key]} isValid={!errors[key]}
              maxLength={key === 'company' ? 50 : 150} autoCapitalize="words" onChangeText={value => setFieldValue(key, value)} />
          </View>)}
          {Object.values(errors).map((error, index) => <Text key={index} color={colors.danger}>{error}</Text>)}
          {status && <Text color={colors.danger} accessibilityLiveRegion="polite" style={{ marginVertical: 12 }}>{status}</Text>}
          <Text color={colors.muted} style={{ marginTop: 12 }}>An internet connection is required to save profile changes.</Text>
        </>}
    </DraftForm>
  </KeyboardAvoidingView>;
}
