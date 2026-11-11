import PrimaryActionButton from './PrimaryActionButton';
import ScrollableFormCard from './ScrollableFormCard';
import DraftForm from '../drafts/DraftForm';
import { useMemo } from 'react';
import React, { useContext, useRef } from 'react';
import { Alert, KeyboardAvoidingView, Platform, Pressable, StyleSheet, View } from 'react-native';
import Text from './AppText';
import { OPERATING_RULES as rules, tailnumberSchema as schema } from '../forms/tailnumberValidation.mjs';
import AircraftPicker from './AircraftPicker';
import AppTextInput from './AppTextInput';
import AppContext from './AppContext';
import { useAppTheme } from '../theme/ThemeProvider';

export default function TailnumberForm({ initialValues, method, onSaved, aircraft_type, allowAircraftChange = false }) {
  const { styles: STYLES } = useAppTheme();
  const styles = useMemo(() => createStyles(STYLES), [STYLES]);
  const savedNavigation = useRef(false);
  const draftHandle = useRef(null);
  const context = useContext(AppContext);
  return <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <DraftForm kind="tailnumber" recordKey={initialValues.local_id || initialValues.id || `new:${initialValues.aircraft || ''}`} draftHandle={draftHandle} savedNavigation={savedNavigation} initialValues={initialValues} validationSchema={schema} validateOnMount
        renderLayout={({ content, form: { values, isSubmitting, isValidating, isValid, handleSubmit }, draftBlocked }) => (
          <ScrollableFormCard footer={<PrimaryActionButton testID="tailnumber-save" title="Save" onPress={handleSubmit}
            disabled={draftBlocked || isSubmitting || isValidating || !isValid || !values.aircraft || !values.registration || rules.filter(([key]) => values[key] === true).length !== 1} />}>
            {content}
          </ScrollableFormCard>
        )}
        onSubmit={async (values, helpers) => {
        savedNavigation.current = false;
        context.setActivityVisible(true);
        try {
          const result = await method(values);
          await draftHandle.current.complete();
          savedNavigation.current = true;
          helpers.resetForm({ values });
          onSaved?.(result);
        } catch (error) {
          const details = error.response?.data;
          const message = details ? Object.entries(details).map(([field, text]) => `${field}: ${Array.isArray(text) ? text.join(' ') : String(text)}`).join('\n')
            : error.response ? 'The server could not save your changes. Please try again.'
            : !error.request ? error.message
            : 'Check your connection and try again. Your changes remain in this form.';
          Alert.alert('Tailnumber not saved', message);
        } finally {
          helpers.setSubmitting(false);
          context.setActivityVisible(false);
        }
      }}>
        {({ values, errors, setFieldValue }) => <>
          <Text style={styles.heading}>{allowAircraftChange ? 'Aircraft' : aircraft_type}</Text>
          {allowAircraftChange && <AircraftPicker initialValue={values.aircraft} fieldName="aircraft" setFieldValue={setFieldValue} isValid={!errors.aircraft} />}
          {errors.aircraft && <Text style={styles.error}>{errors.aircraft}</Text>}
          <Text style={styles.label}>Registration</Text>
          <AppTextInput value={values.registration} placeholder="Registration" maxLength={8}
            onChangeText={value => setFieldValue('registration', value.toUpperCase().replace(/\s/g, ''))}
            isValid={Boolean(values.registration) && !errors.registration} autoCorrect={false} autoCapitalize="characters" />
          {(errors.registration || !values.registration) && <Text style={styles.error}>{errors.registration || 'Required'}</Text>}
          <Text style={styles.label}>Operating rules</Text>
          <View style={styles.rules}>
            {rules.map(([key, label]) => <Pressable key={key} accessibilityRole="radio" accessibilityState={{ checked: values[key] === true }}
              onPress={() => rules.forEach(([field]) => setFieldValue(field, field === key))}
              style={[styles.rule, (errors.operating_rules || !rules.some(([field]) => values[field])) && { borderColor: STYLES.danger }, values[key] && styles.selected]}>
              <Text style={{ color: values[key] ? STYLES.blue : STYLES.black }}>{label}</Text>
            </Pressable>)}
          </View>
          {(errors.operating_rules || !rules.some(([key]) => values[key])) && <Text style={styles.error}>{errors.operating_rules || 'Required'}</Text>}
          <Text style={{ color: STYLES.muted, marginTop: 12 }}>{initialValues.id ? 'A connection is required to update this tailnumber.' : 'Saved on this device first; uploads when connected.'}</Text>
        </>}
      </DraftForm>
  </KeyboardAvoidingView>;
}
const createStyles = STYLES => StyleSheet.create({
  heading: { fontSize: 20, fontWeight: '600' },
  label: { fontWeight: '600', marginTop: 16 }, rules: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 12 },
  rule: { minHeight: 44, padding: 12, borderWidth: 1, borderColor: STYLES.grey, borderRadius: 5 },
  selected: { borderColor: STYLES.blue, backgroundColor: STYLES.selected }, error: { color: STYLES.danger, marginTop: 8 },
});
