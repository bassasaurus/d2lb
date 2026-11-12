import FormKeyboardAvoidingView from '../components/FormKeyboardAvoidingView';
import syncFlightData from '../api/syncFlightData';
import PrimaryActionButton from '../components/PrimaryActionButton';
import ScrollableFormCard from '../components/ScrollableFormCard';
import DraftForm from '../drafts/DraftForm';
import { useMemo } from 'react';
import React, { useRef } from 'react';
import { Alert, Pressable, StyleSheet, Switch, View } from 'react-native';
import Text from '../components/AppText';
import { aircraftSchema as schema } from './validation.mjs';
import AppTextInput from '../components/AppTextInput';
import { saveAircraft } from '../storage/aircraft';
import { aircraftValues, CATEGORY_CHOICES, CLASS_CHOICES, ENGINE_CHOICES, FLAGS, WEIGHT_CHOICES } from './fields.mjs';
import { useAppTheme } from '../theme/ThemeProvider';

function Choices({ title, choices, selected, onSelect, error }) {
  const { styles: STYLES } = useAppTheme();
  const styles = useMemo(() => createStyles(STYLES), [STYLES]);
  return <View style={styles.group}><Text style={styles.label}>{title}</Text><View style={styles.options}>
    {choices.map(([key, label]) => <Pressable key={key} accessibilityRole="radio" accessibilityState={{ checked: selected === key }}
      onPress={() => onSelect(key)} style={[styles.option, error && { borderColor: STYLES.danger }, selected === key && styles.selected]}>
      <Text style={{ color: selected === key ? STYLES.blue : STYLES.black }}>{label}</Text>
    </Pressable>)}
  </View>{error && <Text style={styles.error}>{error}</Text>}</View>;
}
export default function AircraftFormScreen({ route, navigation }) {
  const { styles: STYLES } = useAppTheme();
  const styles = useMemo(() => createStyles(STYLES), [STYLES]);
  const record = route.params?.item;
  const savedNavigation = useRef(false);
  const draftHandle = useRef(null);
  return <FormKeyboardAvoidingView style={{ flex: 1 }}>
      <DraftForm kind="aircraft" recordKey={record?.local_id || record?.id || 'new'} draftHandle={draftHandle} savedNavigation={savedNavigation} initialValues={aircraftValues(record)} validationSchema={schema} validateOnMount
        renderLayout={({ content, form: { values, isSubmitting, isValidating, isValid, handleSubmit }, draftBlocked }) => (
          <ScrollableFormCard footer={<PrimaryActionButton title="Save" onPress={handleSubmit}
            disabled={draftBlocked || isSubmitting || isValidating || !isValid || !values.aircraft_type || !values.aircraft_category || !values.aircraft_class || ENGINE_CHOICES.filter(([key]) => values[key]).length !== 1 || WEIGHT_CHOICES.filter(([key]) => values[key]).length !== 1} />}>
            {content}
          </ScrollableFormCard>
        )}
        onSubmit={async (values, helpers) => {
        savedNavigation.current = false;
        try {
          const item = await saveAircraft(values);
          await draftHandle.current.complete();
          savedNavigation.current = true;
          helpers.resetForm({ values });
          navigation.popTo('AircraftDetail', { item });
          syncFlightData().catch(() => {});
        } catch (error) {
          helpers.setStatus(error.message || 'Aircraft not saved. Your changes remain in this form.');
        } finally { helpers.setSubmitting(false); }
      }}>
        {({ values, errors, status, setFieldValue }) => {
          const chooseFlag = (choices, key) => choices.forEach(([field]) => setFieldValue(field, field === key));
          return <>
            <Text style={styles.label}>Aircraft Type</Text>
            <AppTextInput value={values.aircraft_type} placeholder="e.g. C172" maxLength={10} editable={!record?.id}
              autoCapitalize="characters" autoCorrect={false} isValid={Boolean(values.aircraft_type) && !errors.aircraft_type}
              onChangeText={value => setFieldValue('aircraft_type', value.toUpperCase().replace(/\s/g, ''))} />
            {errors.aircraft_type && <Text style={styles.error}>{errors.aircraft_type}</Text>}
            {record?.id && <Text style={styles.help}>Use the website to rename an existing type designator.</Text>}
            <Choices title="Category" error={errors.aircraft_category || (!values.aircraft_category ? 'Required' : null)} choices={CATEGORY_CHOICES} selected={values.aircraft_category} onSelect={key => {
              setFieldValue('aircraft_category', key);
              if (values.aircraft_category !== key) setFieldValue('aircraft_class', '');
            }} />
            <Choices title="Class" error={errors.aircraft_class || (!values.aircraft_class ? 'Required' : null)} choices={CLASS_CHOICES.filter(([key]) => !values.aircraft_category || (values.aircraft_category === 'R') === ['HELO', 'GYRO'].includes(key))}
              selected={values.aircraft_class} onSelect={key => setFieldValue('aircraft_class', key)} />
            <Choices title="Engine" error={errors.engine || (!ENGINE_CHOICES.some(([key]) => values[key]) ? 'Required' : null)} choices={ENGINE_CHOICES} selected={ENGINE_CHOICES.find(([key]) => values[key])?.[0]} onSelect={key => chooseFlag(ENGINE_CHOICES, key)} />
            <Choices title="Weight Category" error={errors.weight_category || (!WEIGHT_CHOICES.some(([key]) => values[key]) ? 'Required' : null)} choices={WEIGHT_CHOICES} selected={WEIGHT_CHOICES.find(([key]) => values[key])?.[0]} onSelect={key => chooseFlag(WEIGHT_CHOICES, key)} />
            {FLAGS.map(([key, label]) => <View key={key} style={styles.flag}><Text>{label}</Text><Switch value={values[key]} onValueChange={value => setFieldValue(key, value)} accessibilityLabel={label} /></View>)}
            {errors[''] && <Text style={styles.error}>{errors['']}</Text>}
            {status && <Text style={styles.error} accessibilityLiveRegion="polite">{status}</Text>}
            <Text style={styles.help}>Saved on this device first; uploads when connected.</Text>
          </>;
        }}
      </DraftForm>
  </FormKeyboardAvoidingView>;
}
const createStyles = STYLES => StyleSheet.create({
  label: { fontWeight: '600', marginBottom: 4 },
  group: { marginTop: 16 }, options: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  option: { padding: 10, borderWidth: 1, borderColor: STYLES.grey, borderRadius: 5 },
  selected: { borderColor: STYLES.blue, backgroundColor: STYLES.selected },
  flag: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginVertical: 8 },
  error: { color: STYLES.danger, marginTop: 4 }, help: { color: STYLES.muted, marginVertical: 8 },
});
