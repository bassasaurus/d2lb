import Card from '../components/Card';
import { ScrollView } from '../components/OverflowLists';
import DraftForm from '../drafts/DraftForm';
import { useMemo } from 'react';
import React, { useRef } from 'react';
import { Alert, Button, KeyboardAvoidingView, Platform, Pressable, StyleSheet, Switch, View } from 'react-native';
import Text from '../components/AppText';
import * as yup from 'yup';
import AppTextInput from '../components/AppTextInput';
import { saveAircraft } from '../storage/aircraft';
import { aircraftValues, CATEGORY_CHOICES, CLASS_CHOICES, ENGINE_CHOICES, FLAGS, WEIGHT_CHOICES } from './fields.mjs';
import { useAppTheme } from '../theme/ThemeProvider';

function Choices({ title, choices, selected, onSelect }) {
  const { styles: STYLES } = useAppTheme();
  const styles = useMemo(() => createStyles(STYLES), [STYLES]);
  return <View style={styles.group}><Text style={styles.label}>{title}</Text><View style={styles.options}>
    {choices.map(([key, label]) => <Pressable key={key} accessibilityRole="radio" accessibilityState={{ checked: selected === key }}
      onPress={() => onSelect(key)} style={[styles.option, selected === key && styles.selected]}>
      <Text style={{ color: selected === key ? STYLES.blue : STYLES.black }}>{label}</Text>
    </Pressable>)}
  </View></View>;
}
const schema = yup.object({
  aircraft_type: yup.string().matches(/^[A-Za-z0-9-]{1,10}$/, 'Use 1–10 letters, numbers or hyphens.').required('Aircraft type is required.'),
  aircraft_category: yup.string().oneOf(['A', 'R']).required('Choose a category.'),
  aircraft_class: yup.string().oneOf(CLASS_CHOICES.map(([key]) => key)).required('Choose a class.'),
}).test('category-class', 'Aircraft category and class must agree.', values => !values.aircraft_class || !values.aircraft_category
  || (values.aircraft_category === 'R') === ['HELO', 'GYRO'].includes(values.aircraft_class));

export default function AircraftFormScreen({ route, navigation }) {
  const { styles: STYLES } = useAppTheme();
  const styles = useMemo(() => createStyles(STYLES), [STYLES]);
  const record = route.params?.item;
  const savedNavigation = useRef(false);
  const draftHandle = useRef(null);
  return <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
    <ScrollView style={{ backgroundColor: STYLES.itemBackground }} contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
      <Card>
      <DraftForm kind="aircraft" recordKey={record?.local_id || record?.id || 'new'} draftHandle={draftHandle} savedNavigation={savedNavigation} initialValues={aircraftValues(record)} validationSchema={schema} onSubmit={async (values, helpers) => {
        savedNavigation.current = false;
        try {
          const item = await saveAircraft(values);
          await draftHandle.current.complete();
          savedNavigation.current = true;
          helpers.resetForm({ values });
          navigation.popTo('AircraftDetail', { item });
        } catch (error) {
          helpers.setStatus(error.message || 'Aircraft not saved. Your changes remain in this form.');
        } finally { helpers.setSubmitting(false); }
      }}>
        {({ values, errors, submitCount, status, isSubmitting, setFieldValue, handleSubmit }) => {
          const chooseFlag = (choices, key) => choices.forEach(([field]) => setFieldValue(field, field === key));
          return <>
            <Text style={styles.label}>Aircraft type</Text>
            <AppTextInput value={values.aircraft_type} placeholder="e.g. C172" maxLength={10} editable={!record?.id}
              autoCapitalize="characters" autoCorrect={false} isValid={!submitCount || !errors.aircraft_type}
              onChangeText={value => setFieldValue('aircraft_type', value.toUpperCase().replace(/\s/g, ''))} />
            {record?.id && <Text style={styles.help}>Use the website to rename an existing type designator.</Text>}
            <Choices title="Category" choices={CATEGORY_CHOICES} selected={values.aircraft_category} onSelect={key => {
              setFieldValue('aircraft_category', key);
              if (values.aircraft_category !== key) setFieldValue('aircraft_class', '');
            }} />
            <Choices title="Class" choices={CLASS_CHOICES.filter(([key]) => !values.aircraft_category || (values.aircraft_category === 'R') === ['HELO', 'GYRO'].includes(key))}
              selected={values.aircraft_class} onSelect={key => setFieldValue('aircraft_class', key)} />
            <Choices title="Engine" choices={ENGINE_CHOICES} selected={ENGINE_CHOICES.find(([key]) => values[key])?.[0]} onSelect={key => chooseFlag(ENGINE_CHOICES, key)} />
            <Choices title="Weight category" choices={WEIGHT_CHOICES} selected={WEIGHT_CHOICES.find(([key]) => values[key])?.[0]} onSelect={key => chooseFlag(WEIGHT_CHOICES, key)} />
            {FLAGS.map(([key, label]) => <View key={key} style={styles.flag}><Text>{label}</Text><Switch value={values[key]} onValueChange={value => setFieldValue(key, value)} accessibilityLabel={label} /></View>)}
            {submitCount > 0 && Object.values(errors).map((error, index) => <Text key={index} style={styles.error}>{String(error)}</Text>)}
            {status && <Text style={styles.error} accessibilityLiveRegion="polite">{status}</Text>}
            <Button color={STYLES.blue} title={isSubmitting ? 'Saving…' : 'Save aircraft'} disabled={isSubmitting} onPress={handleSubmit} />
            <Text style={styles.help}>Saved on this device first; uploads when connected.</Text>
          </>;
        }}
      </DraftForm>
      </Card>
    </ScrollView>
  </KeyboardAvoidingView>;
}
const createStyles = STYLES => StyleSheet.create({
  container: { padding: 12, paddingBottom: 24 }, label: { fontWeight: '600', marginBottom: 4 },
  group: { marginTop: 16 }, options: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  option: { padding: 10, borderWidth: 1, borderColor: STYLES.grey, borderRadius: 5 },
  selected: { borderColor: STYLES.blue, backgroundColor: STYLES.selected },
  flag: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginVertical: 8 },
  error: { color: STYLES.danger, marginVertical: 8 }, help: { color: STYLES.muted, marginVertical: 8 },
});
