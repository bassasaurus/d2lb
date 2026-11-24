import { formFeedback } from '../forms/errorFeedback.mjs';
import FormKeyboardAvoidingView from '../components/FormKeyboardAvoidingView';
import PrimaryActionButton from '../components/PrimaryActionButton';
import ScrollableFormCard from '../components/ScrollableFormCard';
import DraftForm from '../drafts/DraftForm';
import { useMemo } from 'react';
import React, { useRef } from 'react';
import { Alert, Pressable, StyleSheet, Switch, View } from 'react-native';
import Text from '../components/AppText';
import { createAircraftSchema } from './validation.mjs';
import AppTextInput from '../components/AppTextInput';
import { saveAircraft } from '../storage/aircraft';
import { aircraftValues, CATEGORY_CHOICES, ENGINE_CHOICES, FLAGS, WEIGHT_CHOICES } from './fields.mjs';
import { classificationChanged, classificationErrors, classRequired, classChoices, withAircraftCategory } from './classification.mjs';
import { engineRequired, normalizeCharacteristics, flagApplicable, selectCharacteristic } from './characteristics.mjs';
import { useAppTheme } from '../theme/ThemeProvider';

function Choices({ title, choices, selected, onSelect, error, first = false }) {
  const { styles: STYLES } = useAppTheme();
  const styles = useMemo(() => createStyles(STYLES), [STYLES]);
  return <View style={[styles.group, first && { marginTop: 0 }]}><Text style={styles.label}>{title}</Text><View style={styles.options}>
    {choices.map(([key, label]) => <Pressable key={key} testID={`aircraft-${title.toLowerCase().replaceAll(" ", "-")}-${key}`} accessibilityRole="radio" accessibilityState={{ checked: selected === key }}
      onPress={() => onSelect(key)} style={[styles.option, (error || !selected) && { borderColor: STYLES.danger }, selected === key && styles.selected]}>
      <Text style={{ color: selected === key ? STYLES.blue : STYLES.black }}>{label}</Text>
    </Pressable>)}
  </View>{error && <Text style={styles.error}>{error}</Text>}</View>;
}
export default function AircraftFormScreen({ route, navigation }) {
  const { styles: STYLES } = useAppTheme();
  const styles = useMemo(() => createStyles(STYLES), [STYLES]);
  const record = route.params?.item;
  const schema = useMemo(() => createAircraftSchema(record), [record]);
  const savedNavigation = useRef(false);
  const draftHandle = useRef(null);
  return <FormKeyboardAvoidingView style={{ flex: 1 }}>
      <DraftForm kind="aircraft" recordKey={record?.local_id || record?.id || 'new'} draftHandle={draftHandle} savedNavigation={savedNavigation} initialValues={aircraftValues(record)} validationSchema={schema} validateOnMount
        renderLayout={({ content, form: { values, isSubmitting, isValidating, isValid, handleSubmit }, draftBlocked }) => (
          <ScrollableFormCard footer={<PrimaryActionButton testID="aircraft-save" title="Save" onPress={handleSubmit}
            disabled={draftBlocked || isSubmitting || isValidating || !isValid || !values.aircraft_type
              || Object.keys(classificationErrors(values, record)).length > 0
              || engineRequired(values) && ENGINE_CHOICES.filter(([key]) => values[key]).length !== 1
              || WEIGHT_CHOICES.filter(([key]) => values[key]).length !== 1} />}>
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
        } catch (error) {
          const feedback = formFeedback(error, 'aircraft');
          helpers.setErrors(feedback.fields);
          helpers.setStatus(feedback.status);
        } finally { helpers.setSubmitting(false); }
      }}>
        {({ values, errors, status, setFieldValue, setValues }) => {
          const chooseFlag = (choices, key) => setValues(current => selectCharacteristic(current, choices, key));
          return <>
            <Choices first title="Category" error={errors.aircraft_category} choices={CATEGORY_CHOICES} selected={values.aircraft_category}
              onSelect={key => setValues(normalizeCharacteristics(withAircraftCategory(values, key)))} />
            {classRequired(values.aircraft_category) && <Choices title="Class" error={errors.aircraft_class}
              choices={classChoices(values.aircraft_category)} selected={values.aircraft_class} onSelect={key => setValues(normalizeCharacteristics({ ...values, aircraft_class: key }))} />}
            {record?.id && classificationChanged(values, record) && <Text style={styles.help} accessibilityLiveRegion="polite">Changing Category or Class regroups this aircraft’s existing flights and totals.</Text>}
            <View style={styles.group}><Text style={styles.label}>Aircraft Type</Text>
            <AppTextInput testID="aircraft-type" style={{ marginTop: 0 }} value={values.aircraft_type} placeholder="e.g. C172" maxLength={10} editable={!record?.id}
              autoCapitalize="characters" autoCorrect={false} isValid={Boolean(values.aircraft_type) && !errors.aircraft_type}
              onChangeText={value => setFieldValue('aircraft_type', value.toUpperCase().replace(/\s/g, ''))} />
            {errors.aircraft_type && <Text style={styles.error}>{errors.aircraft_type}</Text>}
            {record?.id && <Text style={styles.help}>Use the website to rename an existing type designator.</Text>}</View>
            {engineRequired(values) && <Choices title="Engine" error={errors.engine || (!ENGINE_CHOICES.some(([key]) => values[key]) ? 'Required' : null)} choices={ENGINE_CHOICES} selected={ENGINE_CHOICES.find(([key]) => values[key])?.[0]} onSelect={key => chooseFlag(ENGINE_CHOICES, key)} />}
            {values.aircraft_category === 'GL' && <View style={styles.flag}><Text>Self-launch capable</Text><Switch testID="aircraft-self-launch" value={Boolean(values.self_launch_capable)}
              onValueChange={value => setFieldValue('self_launch_capable', value)} accessibilityLabel="Self-launch capable" /></View>}
            {FLAGS.filter(([key]) => flagApplicable(values, key)).map(([key, label]) => <View key={key} style={styles.flag}><Text>{label}</Text><Switch value={values[key]} disabled={key === 'requires_type' && values.aircraft_category === 'PL'} onValueChange={value => setFieldValue(key, value)} accessibilityLabel={label} /></View>)}
            <Choices title="Wake Category" error={errors.weight_category || (!WEIGHT_CHOICES.some(([key]) => values[key]) ? 'Required' : null)} choices={WEIGHT_CHOICES} selected={WEIGHT_CHOICES.find(([key]) => values[key])?.[0]} onSelect={key => chooseFlag(WEIGHT_CHOICES, key)} />
            <Text style={styles.help}>ATC wake classes: Small ≤41,000 lb; Large &gt;41,000 and &lt;300,000 lb; Heavy ≥300,000 lb; Super designation.</Text>
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
