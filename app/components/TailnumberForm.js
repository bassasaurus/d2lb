import React, { useContext, useRef } from 'react';
import { Alert, Button, KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Formik } from 'formik';
import * as yup from 'yup';
import AircraftPicker from './AircraftPicker';
import AppTextInput from './AppTextInput';
import AppContext from './AppContext';
import UnsavedFormGuard from './UnsavedFormGuard';
import { STYLES } from '../styles/styles';

const rules = [['is_91', 'Part 91'], ['is_135', 'Part 135'], ['is_121', 'Part 121']];
const schema = yup.object({
  aircraft: yup.string().required('Select an aircraft.'),
  registration: yup.string().min(3).max(8).required('Registration is required.'),
}).test('operating-rule', 'Select one operating rule.', values => rules.filter(([key]) => values[key]).length === 1);

export default function TailnumberForm({ initialValues, method, onSaved, aircraft_type, allowAircraftChange = false }) {
  const savedNavigation = useRef(false);
  const context = useContext(AppContext);
  return <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
    <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
      <Formik initialValues={initialValues} validationSchema={schema} onSubmit={async (values, helpers) => {
        savedNavigation.current = false;
        context.setActivityVisible(true);
        try {
          const result = await method(values);
          savedNavigation.current = true;
          helpers.resetForm({ values });
          onSaved?.(result);
        } catch (error) {
          const details = error.response?.data;
          const message = details ? Object.entries(details).map(([field, text]) => `${field}: ${Array.isArray(text) ? text.join(' ') : String(text)}`).join('\n')
            : error.response ? 'The server could not save your changes. Please try again.'
            : error.message?.startsWith('Sync the pending') ? error.message
            : 'Check your connection and try again. Your changes remain in this form.';
          Alert.alert('Tailnumber not saved', message);
        } finally {
          helpers.setSubmitting(false);
          context.setActivityVisible(false);
        }
      }}>
        {({ values, errors, submitCount, isSubmitting, setFieldValue, handleSubmit }) => <>
          <UnsavedFormGuard savedNavigation={savedNavigation} />
          <Text style={styles.heading}>{allowAircraftChange ? 'Aircraft' : aircraft_type}</Text>
          {allowAircraftChange && <AircraftPicker initialValue={values.aircraft} fieldName="aircraft" setFieldValue={setFieldValue} isValid={!errors.aircraft} />}
          <Text style={styles.label}>Registration</Text>
          <AppTextInput value={values.registration} placeholder="Registration" maxLength={8}
            onChangeText={value => setFieldValue('registration', value.toUpperCase().replace(/\s/g, ''))}
            isValid={!submitCount || !errors.registration} autoCorrect={false} autoCapitalize="characters" />
          <Text style={styles.label}>Operating rules</Text>
          <View style={styles.rules}>
            {rules.map(([key, label]) => <Pressable key={key} accessibilityRole="radio" accessibilityState={{ checked: values[key] === true }}
              onPress={() => rules.forEach(([field]) => setFieldValue(field, field === key))}
              style={[styles.rule, values[key] && styles.selected]}>
              <Text style={{ color: values[key] ? STYLES.blue : STYLES.black }}>{label}</Text>
            </Pressable>)}
          </View>
          {submitCount > 0 && Object.values(errors).map((error, index) => <Text key={index} style={styles.error}>{String(error)}</Text>)}
          <View style={{ marginTop: 20 }}><Button title={isSubmitting ? 'Saving…' : 'Save tailnumber'} onPress={handleSubmit} disabled={isSubmitting} /></View>
          <Text style={{ color: '#555', marginTop: 12 }}>A connection is required to save tailnumbers.</Text>
        </>}
      </Formik>
    </ScrollView>
  </KeyboardAvoidingView>;
}
const styles = StyleSheet.create({
  container: { padding: 16 }, heading: { fontSize: 20, fontWeight: '600' },
  label: { fontWeight: '600', marginTop: 16 }, rules: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 12 },
  rule: { padding: 12, borderWidth: 1, borderColor: STYLES.grey, borderRadius: 5 },
  selected: { borderColor: STYLES.blue, backgroundColor: '#eef3ff' }, error: { color: STYLES.danger, marginTop: 8 },
});
