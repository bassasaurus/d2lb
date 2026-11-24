import { DEVICE_TYPES, simulatorEntryErrors, prepareFlightEntry } from '../forms/simulatorEntry.mjs';
import { formatDate } from '../formatting/dates.mjs';
import { flightFormAction } from '../drafts/flightFormAction.mjs';
import { formFeedback } from '../forms/errorFeedback.mjs';
import FormKeyboardAvoidingView from './FormKeyboardAvoidingView';
import PlatformActionButton from './PlatformActionButton';
import PrimaryActionButton from './PrimaryActionButton';
import { hasRequiredSoloLandings } from '../forms/landingRequirements.mjs';
import { nightPairWarnings } from '../forms/nightWarning.mjs';
import { FLIGHT_ROLES, PRIMARY_FLIGHT_ROLES, hasRequiredFlightRole, toggleFlightRole, isFlightRoleDisabled } from '../forms/flightRoles.mjs';
import ScrollableFormCard from './ScrollableFormCard';
import { listTailnumbers } from '../storage/tailnumbers';
import RouteInput from '../airports/RouteInput';
import { normalizeRoute, routeErrors } from '../airports/routeCheck.mjs';
import PickerOverlayHost from './PickerOverlayHost';
import DraftForm from '../drafts/DraftForm';
import { useMemo } from 'react';
import moment from "moment";
import React, { useState, useContext, useEffect, useRef } from "react";
import { View, StyleSheet, Modal, Pressable, TouchableOpacity, Platform, Alert, useWindowDimensions } from 'react-native';
import Text from './AppText';
import * as yup from "yup";

import DateTimePicker from "@react-native-community/datetimepicker";
import AircraftPicker from "./AircraftPicker";
import AppTextInput from "./AppTextInput";
import TailnumberPicker from "./TailnumberPicker";
import ApproachPicker from "./ApproachPicker";
import AppText from "./AppText";
import Checkbox from "./Checkbox";
import ActivityModal from "./ActivityModal";
import AppContext from "./AppContext";
import { flightScope, flightStore } from "../storage/flights";
import { useFocusEffect } from "@react-navigation/native";
import { MaterialCommunityIcons } from "@expo/vector-icons";

import { useAppTheme } from '../theme/ThemeProvider';

function NightPairWarning({ values }) {
  const { colors } = useAppTheme();
  const message = nightPairWarnings(values).night;
  return message ? <AppText color={colors.danger} accessibilityLiveRegion="polite" style={{ marginTop: 4 }}>{message}</AppText> : null;
}

function FlightForm({ initialValues, method, onSaved, onDraftSaved, noDefaultAircraft = false, onChooseDefault, commitDateOnSelection = false }) {
  const { styles: STYLES, isDark } = useAppTheme();
  const styles = useMemo(() => createStyles(STYLES), [STYLES]);
  const { width: windowWidth, fontScale } = useWindowDimensions();
  const [roleWidth, setRoleWidth] = useState(0);
  const roleColumns = Math.max(1, Math.min(7, Math.floor((roleWidth || windowWidth - 52) / (100 * fontScale))));
  const savedNavigation = useRef(false);
  const draftHandle = useRef(null);
  const draftSaving = useRef(false);
  const [savingDraft, setSavingDraft] = useState(false);
  async function saveDraft() {
    if (draftSaving.current) return;
    draftSaving.current = true;
    setSavingDraft(true);
    try {
      await draftHandle.current.flush();
      savedNavigation.current = true;
      onDraftSaved();
    } catch {
      Alert.alert("Could not save draft", "Keep this form open and try again.");
    } finally {
      draftSaving.current = false;
      setSavingDraft(false);
    }
  }
  const airportCheck = useRef(null);
  const [calVisible, setCalVisible] = useState(false);
  const [defaultSuggestionDismissed, setDefaultSuggestionDismissed] = useState(false);
  const [calendarDate, setCalendarDate] = useState(new Date());
  const [formCount, setFormCount] = useState(() => Math.max(0, ...initialValues.approaches.map((item, index) => item.approach_type || item.number ? index : 0)));
  const [tailnumbers, setTailnumbers] = useState([]);
  const [scanningTailnumber, setScanningTailnumber] = useState(false);
  useFocusEffect(React.useCallback(() => {
    let active = true;
    (async () => {
      const rows = await listTailnumbers();
      if (active) setTailnumbers(rows);
    })().catch(() => { if (active) setTailnumbers([]); });
    return () => { active = false; };
  }, []));
  const [submitting, setSubmitting] = useState(false);
  const [addedDuration, setAddedDuration] = useState("");
  const [undoAdd, setUndoAdd] = useState(false);

  const Context = useContext(AppContext);

  const dashNotSpace = (str) => {
    str = str.replace(/\s/g, "-");
    return str;
  };

  const commitDate = (date, setFieldValue) => {
    setFieldValue("date", moment(date).format("M/D/YYYY"));
    setCalVisible(false);
  };

  const required = "Required";
  const number = "Numbers only";

  let flightSchema = yup.object().shape({
    date: yup.string().required(required),
    route: yup.string().transform(value => normalizeRoute(value)).max(50).when('simulator', { is: true, then: schema => schema, otherwise: schema => schema.min(3).required(required) }).test('known-airports', 'Check the route airports.', function(value) {
      if (this.parent.simulator) return true;
      const current = airportCheck.current;
      const messages = current?.route === normalizeRoute(value) ? routeErrors(current.entries) : [];
      return messages.length ? this.createError({ message: messages.join(' ') }) : true;
    }),
    aircraft_type: yup.string().required(required),
    registration: yup.string().nullable().when('simulator', { is: true, then: schema => schema, otherwise: schema => schema.required(required) }),
    device_type: yup.string().nullable(),
    device_id: yup.string().nullable().max(100, '100 Character Maximum'),
    duration: yup
      .number()
      .typeError(number)
      .required(required)
      .min(0.1, ({ value }) => value < 0 ? "Hours cannot be negative." : "Must be greater than 0.1")
      .max(30.0, "Seems unlikely.")
      .test("maxDigitsAfterDecimal", "max 1 decimal place", (number) =>
        /^\d+(\.\d{1,1})?$/.test(number)
      ),
    landings_day: yup
      .number()
      .typeError(number)
      .moreThan(0, "Leave blank for 0")
      .integer("Integers only, no decimals."),
    landings_night: yup
      .number()
      .typeError(number)
      .moreThan(0, "Leave blank for 0")
      .integer("Integers only, no decimals."),
    night: yup.number().typeError(number).moreThan(0, ({ value }) => value < 0 ? "Hours cannot be negative." : "Leave blank for 0"),
    instrument: yup.number().typeError(number).moreThan(0, ({ value }) => value < 0 ? "Hours cannot be negative." : "Leave blank for 0"),
    simulated_instrument: yup
      .number()
      .typeError(number)
      .moreThan(0, ({ value }) => value < 0 ? "Hours cannot be negative." : "Leave blank for 0"),
    remarks: yup.string().max(256, "256 Character Maximum"),
    number: yup.number().typeError(number).moreThan(0, "Leave blank for 0"),
  }).test('simulator-device', 'Check the training device.', function(values) {
    const errors = simulatorEntryErrors(values);
    if (!Object.keys(errors).length) return true;
    return new yup.ValidationError(Object.entries(errors).map(([path, message]) => this.createError({ path, message })));
  }).test('flight-role', 'Required', function(values) {
    return hasRequiredFlightRole(values) || this.createError({ path: 'flight_role', message: 'Required' });
  }).test('solo-landings', 'Enter Day or Night landings for Solo.', function(values) {
    return hasRequiredSoloLandings(values) || this.createError({ path: 'solo_landings', message: 'Enter Day or Night landings for Solo.' });
  });

  return (
    <FormKeyboardAvoidingView
      style={{ flex: 1 }}
    >
      <PickerOverlayHost>
          <DraftForm kind="flight" recordKey={initialValues.local_id || initialValues.id || 'new'} draftHandle={draftHandle} savedNavigation={savedNavigation} onResume={values => setFormCount(Math.max(0, ...values.approaches.map((item, index) => item.approach_type || item.number ? index : 0)))}
            renderLayout={({ content, form: { values, isValid, isSubmitting, handleSubmit }, draftBlocked }) => {
              const valid = isValid && !Object.keys(simulatorEntryErrors(values)).length && hasRequiredFlightRole(values) && hasRequiredSoloLandings(values);
              const action = flightFormAction({ valid, date: values.date, allowDraft: Boolean(onDraftSaved) });
              return (
              <ScrollableFormCard cardStyle={styles.container} keyboardDismissMode="on-drag"
                footer={<PrimaryActionButton testID="flight-save"
                  title={savingDraft ? "Saving Draft…" : !valid && onDraftSaved ? "Save Draft" : "Save"}
                  onPress={action === 'draft' ? saveDraft : handleSubmit}
                  disabled={draftBlocked || scanningTailnumber || action === 'disabled' || isSubmitting || savingDraft} />}>
                {noDefaultAircraft && !defaultSuggestionDismissed && <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 8 }}>
                  <Pressable accessibilityRole="link" onPress={async () => {
                    try {
                      await draftHandle.current?.flush();
                      onChooseDefault?.();
                    } catch {
                      Alert.alert('Could not save your draft', 'Keep this form open and try again.');
                    }
                  }} hitSlop={{ top: 8, left: 8, right: 8 }} style={{ flex: 1, minHeight: 28, paddingVertical: 4, justifyContent: 'center' }}>
                    <Text style={{ color: STYLES.blue }}>Choose a default aircraft</Text>
                  </Pressable>
                  <Pressable accessibilityRole="button" accessibilityLabel="Dismiss default aircraft suggestion"
                    onPress={() => setDefaultSuggestionDismissed(true)} hitSlop={{ top: 8, left: 4, right: 8 }}
                    style={{ minWidth: 28, minHeight: 28, alignItems: 'center', justifyContent: 'center' }}>
                    <MaterialCommunityIcons name="close" size={20} color={STYLES.muted} />
                  </Pressable>
                </View>}
                {content}
              </ScrollableFormCard>
            ); }}
            validateOnMount={true}
            initialValues={initialValues}
            validationSchema={flightSchema}
            onSubmit={async (values, helpers) => {
              try {
                savedNavigation.current = false;
                const result = await method({ ...prepareFlightEntry(values), route: normalizeRoute(values.route), validate_airports: true });
                await draftHandle.current.complete();
                savedNavigation.current = true;
                helpers.resetForm({ values });
                onSaved?.(result);
              } catch (error) {
                const feedback = formFeedback(error, 'flight');
                helpers.setErrors(feedback.fields);
                helpers.setStatus(feedback.status);
              } finally {
                helpers.setSubmitting(false);
              }
            }}
          >
            {({
              values,
              errors,
              status,
              touched,
              handleChange,
              setFieldValue,
              setValues,
              handleBlur,
            }) => (
              <>
                {status && <Text accessibilityLiveRegion="polite" style={styles.errors}>{status}</Text>}
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                  <View style={{ flex: 1 }}>
                <Pressable
                  testID="flight-date"
                  onPress={() => {
                    const parsed = moment(values.date, "M/D/YYYY", true);
                    setCalendarDate(parsed.isValid() ? parsed.toDate() : new Date());
                    setCalVisible(true);
                  }}
                >
                  <View pointerEvents='none'>
                    <AppTextInput
                      isValid={errors.date ? false : true}
                      value={formatDate(values.date, '')}
                      onChangeText={handleChange("date")}
                      placeholder='Date'
                      onBlur={handleBlur("date")}
                    />
                  </View>
                </Pressable>

                  </View>
                  <View style={{ paddingTop: 10 }}><Checkbox label="Sim" isChecked={Boolean(values.simulator)}
                    onPress={() => setValues(toggleFlightRole(values, 'simulator'))} /></View>
                </View>
                <View>
                  {errors.date ? (
                    <Text style={styles.errors}>{errors.date}</Text>
                  ) : (
                    <View></View>
                  )}
                </View>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                  <View style={{ flex: 1 }}>
                    <AircraftPicker placeholder={values.simulator ? "Aircraft Represented *" : "Aircraft Type *"}
                      initialValue={values.aircraft_type} isValid={!errors.aircraft_type}
                      fieldName="aircraft_type" setFieldValue={setFieldValue} onBlur={handleBlur('aircraft_type')} />
                    {!!errors.aircraft_type && <Text style={styles.errors}>{errors.aircraft_type}</Text>}
                  </View>

{!values.simulator && values.aircraft_type ? <View style={{ flex: 1 }}>
                  <TailnumberPicker initialValue={values.registration} isValid={!errors.registration}
                    setFieldValue={setFieldValue} filterBy={values.aircraft_type} aircraftId={values.aircraft_type}
                    onBlur={handleBlur('registration')} aircraft_type={values.aircraft_type}
                    beforeCreate={() => draftHandle.current?.flush()} onScanBusyChange={setScanningTailnumber} />
                  {!!errors.registration && <Text style={styles.errors}>{errors.registration}</Text>}
                  {values.registration && tailnumbers.some(tail => tail.registration === values.registration && tail.aircraft !== values.aircraft_type)
                    ? <Text style={styles.errors}>Registration mismatch</Text> : null}
                </View> : null}
                </View>
                {values.simulator && <View style={styles.approachesSection}>
                  <AppText weight="600">Training Device</AppText>
                  <AppText>Aircraft Type is the aircraft represented. Simulator time is separate from flight totals.</AppText>
                  <AppText style={{ marginTop: 8 }}>Device Type *</AppText>
                  <View style={{ flexDirection: 'row', gap: 8, marginTop: 4 }}>
                    {DEVICE_TYPES.map(([type, name]) => <Pressable key={type} testID={`device-type-${type}`}
                      accessibilityRole="radio" accessibilityLabel={`${type} — ${name}`}
                      accessibilityState={{ checked: values.device_type === type }}
                      onPress={() => setFieldValue('device_type', type)}
                      style={{ flex: 1, alignItems: 'center', padding: 10, borderRadius: 8, borderWidth: 1,
                        borderColor: values.device_type === type ? STYLES.blue : STYLES.grey }}>
                      <AppText color={values.device_type === type ? STYLES.blue : STYLES.black} weight="600">{type}</AppText>
                    </Pressable>)}
                  </View>
                  {!!values.device_type && <AppText>{DEVICE_TYPES.find(([type]) => type === values.device_type)?.[1]}</AppText>}
                  {!!errors.device_type && <Text style={styles.errors}>{errors.device_type}</Text>}
                  <AppTextInput testID="flight-device-id" value={values.device_id || ''} isValid={!errors.device_id}
                    placeholder="Device ID *" maxLength={100} autoCorrect={false}
                    onChangeText={handleChange('device_id')} onBlur={handleBlur('device_id')} />
                  {!!errors.device_id && <Text style={styles.errors}>{errors.device_id}</Text>}
                  {values.device_type === 'ATD' && <View style={{ marginVertical: 8 }}>
                    <AppText>ATD Classification *</AppText>
                    <View style={{ flexDirection: 'row', gap: 12 }}>
                      {['BATD', 'AATD'].map(type => <Pressable key={type} accessibilityRole="radio"
                        accessibilityState={{ checked: values.atd_type === type }} accessibilityLabel={type}
                        style={{ minHeight: 44, padding: 10 }} onPress={() => setFieldValue('atd_type', type)}>
                        <AppText color={values.atd_type === type ? STYLES.blue : STYLES.black}>{values.atd_type === type ? '● ' : '○ '}{type}</AppText>
                      </Pressable>)}
                    </View>
                    {!!errors.atd_type && <Text style={styles.errors}>{errors.atd_type}</Text>}
                  </View>}
                  <View style={{ marginTop: 8 }}><Checkbox label="Eligible Instrument–Airplane training"
                    isChecked={values.instrument_credit_eligible}
                    onPress={() => setFieldValue('instrument_credit_eligible', !values.instrument_credit_eligible)} /></View>
                  <AppText>Approved instrument training with an authorized instructor. Select Dual and enter the instrument portion below.</AppText>
                  {!!errors.instrument_credit_eligible && <Text style={styles.errors}>{errors.instrument_credit_eligible}</Text>}
                  {!!errors.dual && <Text style={styles.errors}>{errors.dual}</Text>}
                  {Boolean(initialValues.id) && !initialValues.device_type && !values.device_type &&
                    <AppText>Choose the device type for this existing Sim entry.</AppText>}
                </View>}
                {/* duration row */}
                <View
                  style={{
                    flexDirection: "row",
                  }}
                >
                  <View style={{ flexDirection: "column", flex: values.simulator ? 1 : 0.7 }}>
                    <AppTextInput
                      testID="flight-duration"
                      isValid={errors.duration ? false : true}
                      value={values.duration}
                      onChangeText={(val) => {
                        setFieldValue("duration", val);
                      }}
                      placeholder='Duration - XX.X'
                      autoCorrect={false}
                      keyboardType={"numeric"}
                      clearButtonMode={"while-editing"}
                      onBlur={() => {
                        handleBlur("duration");
                      }}
                    ></AppTextInput>
                    <View>
                      {errors.duration ? (
                        <Text style={styles.errors}>{errors.duration}</Text>
                      ) : (
                        <View>
                          <AppText>Duration</AppText>
                        </View>
                      )}
                    </View>
                  </View>
                  {!values.simulator && <>
                  <MaterialCommunityIcons
                    style={{ paddingTop: 15 }}
                    name='plus'
                    size={30}
                    color={STYLES.black}
                  />

                  <View style={{ flexDirection: "column", flex: 0.3 }}>
                    <AppTextInput
                      value={undoAdd ? "<---" : String(addedDuration)}
                      isValid={true}
                      placeholder={"XX.X"}
                      keyboardType={"numeric"}
                      onChangeText={(val) => setAddedDuration(val)}
                    ></AppTextInput>
                    <AppText color={STYLES.black}>Next leg</AppText>
                  </View>

                  {!undoAdd ? (
                    <TouchableOpacity
                      disabled={addedDuration === "" ? true : false}
                      onPress={() => {
                        setUndoAdd(true);
                        setFieldValue(
                          "duration",
                          String(
                            (
                              Number(values.duration) + Number(addedDuration)
                            ).toFixed(1)
                          )
                        );
                      }}
                    >
                      <MaterialCommunityIcons
                        style={{ paddingTop: 15, paddingLeft: 5 }}
                        name='keyboard-return'
                        size={30}
                        color={STYLES.success}
                      />
                    </TouchableOpacity>
                  ) : (
                    <TouchableOpacity
                      onPress={() => {
                        setUndoAdd(false);
                        setFieldValue(
                          "duration",
                          String(
                            (
                              Number(values.duration) - Number(addedDuration)
                            ).toFixed(1)
                          )
                        );
                        setAddedDuration("");
                      }}
                    >
                      <MaterialCommunityIcons
                        style={{ paddingTop: 15, paddingLeft: 5 }}
                        name='undo'
                        size={30}
                        color={STYLES.danger}
                      />
                    </TouchableOpacity>
                  )}
                  </>}
                </View>

                {/* end duration row */}
                {!values.simulator && <RouteInput onCheck={result => { airportCheck.current = result; }} />}

                <View style={[styles.approachesSection, styles.legendSection, { paddingTop: 14 * fontScale }, !hasRequiredFlightRole(values) && { borderColor: STYLES.danger }]}>
                  <AppText size={14} weight="600" style={[styles.sectionLegend, { top: -10 * fontScale }]}>Role</AppText>
                  <View style={[styles.roleGrid, { marginTop: 0 }]}
                    onLayout={event => setRoleWidth(event.nativeEvent.layout.width)}>
                    {FLIGHT_ROLES.filter(([field]) => PRIMARY_FLIGHT_ROLES.includes(field)).map(([field, label]) => <View key={field}
                      style={[styles.checkboxContainer, { width: `${100 / (roleColumns >= 4 ? 4 : Math.min(2, roleColumns))}%` }]}>
                      <Checkbox label={field === 'dual' && values.simulator && values.instrument_credit_eligible ? 'Dual *' : label} isChecked={!isFlightRoleDisabled(values, field) && values[field]} disabled={isFlightRoleDisabled(values, field)}
                        onPress={() => setValues(current => toggleFlightRole(current, field))} />
                    </View>)}
                  </View>
                  {!hasRequiredFlightRole(values) && <Text style={styles.errors}>Required</Text>}
                </View>
                <View style={styles.roleGrid}>
                  {FLIGHT_ROLES.filter(([field]) => field !== 'simulator' && !PRIMARY_FLIGHT_ROLES.includes(field)).map(([field, label]) => <View key={field}
                    style={[styles.checkboxContainer, { width: `${100 / Math.min(3, roleColumns)}%` }]}>
                    <Checkbox label={field === 'dual' && values.simulator && values.instrument_credit_eligible ? 'Dual *' : label} isChecked={!isFlightRoleDisabled(values, field) && values[field]} disabled={isFlightRoleDisabled(values, field)}
                      onPress={() => setValues(current => toggleFlightRole(current, field))} />
                  </View>)}
                </View>
                {!hasRequiredSoloLandings(values) && <Text style={styles.errors} accessibilityLiveRegion="polite">
                  Enter Day or Night landings for Solo.
                </Text>}
                <View
                  style={{
                    flexDirection: "row",
                  }}
                >
                  <View
                    style={{
                      flexDirection: "column",
                      flex: 0.5,
                      marginRight: 10,
                    }}
                  >
                    <AppTextInput
                      testID="flight-landings-day"
                      isValid={!errors.landings_day && hasRequiredSoloLandings(values)}
                      value={values.landings_day.toString()}
                      onChangeText={(val) => {
                        setFieldValue("landings_day", val);
                      }}
                      placeholder='X'
                      autoCorrect={false}
                      keyboardType={"numeric"}
                      clearButtonMode={"while-editing"}
                    ></AppTextInput>
                    <View>
                      {errors.landings_day ? (
                        <Text style={styles.errors}>{errors.landings_day}</Text>
                      ) : (
                        <View>
                          <AppText>Day Landings</AppText>
                        </View>
                      )}
                    </View>
                  </View>

                  <View style={{ flexDirection: "column", flex: 0.5 }}>
                    <AppTextInput
                      testID="flight-landings-night"
                      isValid={!errors.landings_night && hasRequiredSoloLandings(values)}
                      value={values.landings_night.toString()}
                      onChangeText={(val) => {
                        setFieldValue("landings_night", val);
                      }}
                      placeholder='X'
                      autoCorrect={false}
                      keyboardType={"numeric"}
                      clearButtonMode={"while-editing"}
                    ></AppTextInput>
                    <View>
                      {errors.landings_night ? (
                        <Text style={styles.errors}>
                          {errors.landings_night}
                        </Text>
                      ) : (
                        <View>
                          <AppText>Night Landings</AppText>
                        </View>
                      )}
                    </View>
                  </View>
                </View>
                <View style={{ flexDirection: "row" }}>
                  <View
                    style={{
                      flexDirection: "column",
                      flex: 0.5,
                      marginRight: 10,
                    }}
                  >
                    <AppTextInput
                      isValid={true}
                      value={values.instrument.toString()}
                      onChangeText={(val) => {
                        setFieldValue("instrument", val);
                      }}
                      placeholder='X.X'
                      autoCorrect={false}
                      keyboardType={"numeric"}
                      clearButtonMode={"while-editing"}
                    ></AppTextInput>
                    <View>
                      {errors.instrument ? (
                        <Text style={styles.errors}>{errors.instrument}</Text>
                      ) : (
                        <View>
                          <AppText>Actual Instrument</AppText>
                        </View>
                      )}
                    </View>
                  </View>

                  <View style={{ flexDirection: "column", flex: 0.5 }}>
                    <AppTextInput
                      isValid={true}
                      value={values.simulated_instrument.toString()}
                      onChangeText={(val) => {
                        setFieldValue("simulated_instrument", val);
                      }}
                      placeholder='X.X'
                      autoCorrect={false}
                      keyboardType={"numeric"}
                      clearButtonMode={"while-editing"}
                    ></AppTextInput>

                    <View>
                      {errors.simulated_instrument ? (
                        <Text style={styles.errors}>
                          {errors.simulated_instrument}
                        </Text>
                      ) : (
                        <View>
                          <AppText>{values.simulator && values.instrument_credit_eligible ? 'Simulated Instrument *' : 'Simulated Instrument'}</AppText>
                        </View>
                      )}
                    </View>
                  </View>

                  <View
                    style={{
                      flexDirection: "column",
                      flex: 0.5,
                      marginLeft: 10,
                    }}
                  >
                    <AppTextInput
                      testID="flight-night"
                      isValid={!errors.night && !nightPairWarnings(values).night}
                      value={values.night.toString()}
                      onChangeText={(val) => {
                        setFieldValue("night", val);
                      }}
                      placeholder='X.X'
                      autoCorrect={false}
                      keyboardType={"numeric"}
                      clearButtonMode={"while-editing"}
                    ></AppTextInput>

                    <View>
                      {errors.night ? (
                        <Text style={styles.errors}>{errors.night}</Text>
                      ) : (
                        <View>
                          <AppText>Night</AppText>
                        </View>
                      )}
                    </View>
                    <NightPairWarning values={values} />
                  </View>
                </View>
                <View style={[styles.approachesSection, styles.legendSection, { paddingTop: 14 * fontScale }]}>
                  <AppText size={14} weight="600" style={[styles.sectionLegend, { top: -10 * fontScale }]}>Approaches</AppText>
                <View style={styles.approachRow}>
                  <View style={{ flex: 1, minWidth: 0 }}><ApproachPicker
                    isValid={errors.number ? false : true}
                    setFieldValue={setFieldValue}
                    approachKey={"approaches[0].approach_type"}
                    approachValue={values.approaches[0].approach_type}
                    numberKey={"approaches[0].number"}
                    numberValue={values.approaches[0].number}
                  ></ApproachPicker></View>
                  <View style={styles.clearApproachType}>
                    {formCount == 0 ? (
                      <TouchableOpacity
                        onPress={() => {
                          setFieldValue("approaches[0].approach_type", "");
                          setFieldValue("approaches[0].number", "");
                          setFormCount(0);
                        }}
                      >
                        <AppText color={STYLES.danger}>Remove</AppText>
                      </TouchableOpacity>
                    ) : (
                      <View></View>
                    )}
                  </View>
                </View>
                {formCount > 0 ? (
                  <View style={styles.approachRow}>
                    <View style={{ flex: 1, minWidth: 0 }}><ApproachPicker
                      isValid={true}
                      setFieldValue={setFieldValue}
                      approachKey={"approaches[1].approach_type"}
                      approachValue={values.approaches[1].approach_type}
                      numberKey={"approaches[1].number"}
                      numberValue={values.approaches[1].number}
                    ></ApproachPicker></View>
                    <View style={styles.clearApproachType}>
                      {formCount == 1 ? (
                        <TouchableOpacity
                          onPress={() => {
                            setFieldValue("approaches[1].approach_type", "");
                            setFieldValue("approaches[1].number", "");
                            setFormCount(0);
                          }}
                        >
                          <AppText color={STYLES.danger}>Remove</AppText>
                        </TouchableOpacity>
                      ) : (
                        <View></View>
                      )}
                    </View>
                  </View>
                ) : (
                  <View></View>
                )}
                {formCount > 1 ? (
                  <View style={styles.approachRow}>
                    <View style={{ flex: 1, minWidth: 0 }}><ApproachPicker
                      isValid={true}
                      setFieldValue={setFieldValue}
                      approachKey={"approaches[2].approach_type"}
                      approachValue={values.approaches[2].approach_type}
                      numberKey={"approaches[2].number"}
                      numberValue={values.approaches[2].number}
                    ></ApproachPicker></View>
                    <View style={styles.clearApproachType}>
                      {formCount == 2 ? (
                        <TouchableOpacity
                          onPress={() => {
                            setFieldValue("approaches[2].approach_type", "");
                            setFieldValue("approaches[2].number", "");
                            setFormCount(formCount - 1);
                          }}
                        >
                          <AppText color={STYLES.danger}>Remove</AppText>
                        </TouchableOpacity>
                      ) : (
                        <View></View>
                      )}
                    </View>
                  </View>
                ) : (
                  <View></View>
                )}
                {formCount > 2 ? (
                  <View style={styles.approachRow}>
                    <View style={{ flex: 1, minWidth: 0 }}><ApproachPicker
                      isValid={true}
                      setFieldValue={setFieldValue}
                      approachKey={"approaches[3].approach_type"}
                      approachValue={values.approaches[3].approach_type}
                      numberKey={"approaches[3].number"}
                      numberValue={values.approaches[3].number}
                    ></ApproachPicker></View>
                    <View style={styles.clearApproachType}>
                      {formCount == 3 ? (
                        <TouchableOpacity
                          onPress={() => {
                            setFieldValue("approaches[3].approach_type", "");
                            setFieldValue("approaches[3].number", "");
                            setFormCount(formCount - 1);
                          }}
                        >
                          <AppText color={STYLES.danger}>Remove</AppText>
                        </TouchableOpacity>
                      ) : (
                        <View></View>
                      )}
                    </View>
                  </View>
                ) : (
                  <View></View>
                )}
                <View style={{ flexDirection: "row" }}>
                  {formCount < 3 ? (
                    <TouchableOpacity
                      onPress={() => setFormCount(formCount + 1)}
                    >
                      <Text style={{ marginTop: 10, color: STYLES.success }}>
                        Add approach
                      </Text>
                    </TouchableOpacity>
                  ) : (
                    <View style={{ paddingLeft: 125 }}></View>
                  )}
                </View>
                </View>
                <View style={{ flexDirection: "row", marginTop: 10 }}>
                  <Checkbox
                    label="Holding"
                    onPress={() => setFieldValue("hold", !values.hold)}
                    isChecked={values.hold}
                  />
                </View>
                <AppTextInput
                  isValid={true}
                  style={{
                    paddingRight: 10,
                    paddingLeft: 10,
                    height: 80,
                    marginTop: 10,
                    borderWidth: 1,
                    borderRadius: STYLES.borderRadius,
                    borderColor: STYLES.grey,
                  }}
                  testID="flight-remarks"
                  value={values.remarks}
                  onChangeText={(val) => {
                    setFieldValue("remarks", val);
                  }}
                  placeholder='Remarks'
                  autoCorrect={false}
                  multiline={true}
                ></AppTextInput>
                <View>
                  {errors.remarks ? (
                    <Text style={styles.errors}>{errors.remarks}</Text>
                  ) : (
                    <View></View>
                  )}
                </View>
                {calVisible && Platform.OS === "android" && (
                  <DateTimePicker
                    value={calendarDate}
                    mode="date"
                    display="default"
                    onChange={(event, date) => {
                      setCalVisible(false);
                      if (date && event.type === "set") {
                        setFieldValue("date", moment(date).format("M/D/YYYY"));
                      }
                    }}
                  />
                )}
                {calVisible && Platform.OS === "ios" && (
                  <Modal
                    animationType="slide"
                    transparent={true}
                    visible={true}
                    onRequestClose={() => setCalVisible(false)}
                  >
                    <View style={styles.calendarBackdrop}>
                      <View style={styles.calendarSheet}>
                        <View style={styles.calendarActions}>
                          <PlatformActionButton variant="text" title="Cancel" onPress={() => setCalVisible(false)} />
                          <PlatformActionButton variant="text" title="Done" onPress={() => commitDate(calendarDate, setFieldValue)} />
                        </View>
                        <DateTimePicker
                          value={calendarDate}
                          mode="date"
                          display="inline"
                          themeVariant={isDark ? "dark" : "light"}
                          style={{ width: "100%" }}
                          onValueChange={(_, date) => {
                            if (commitDateOnSelection) commitDate(date, setFieldValue);
                            else setCalendarDate(date);
                          }}
                        />
                      </View>
                    </View>
                  </Modal>
                )}
              </>
            )}
          </DraftForm>
          <ActivityModal />
      </PickerOverlayHost>
    </FormKeyboardAvoidingView>
  );
}

const createStyles = STYLES => StyleSheet.create({
  calendarBackdrop: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "rgba(0,0,0,0.35)",
  },
  calendarSheet: {
    width: "94%",
    maxWidth: 420,
    padding: 12,
    backgroundColor: STYLES.surface,
    borderRadius: 16,
  },
  calendarActions: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  container: {
    flexDirection: "column",
    justifyContent: "space-between",
    padding: 14,
  },

  modalView: {
    margin: 20,
    backgroundColor: STYLES.surface,
    borderRadius: 20,
    padding: 35,

    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
  },

  errors: {
    color: STYLES.danger,
  },

  centeredView: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    marginTop: 22,
  },

  roleGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    marginTop: 8,
    rowGap: 2,
  },
  checkboxContainer: {
    paddingRight: 8,
  },

  approachesSection: {
    borderWidth: 1,
    borderColor: STYLES.grey,
    borderRadius: 10,
    padding: 10,
    marginTop: 14,
    marginBottom: 4,
  },
  legendSection: { marginTop: 18 },
  sectionLegend: {
    position: 'absolute',
    left: 12,
    paddingHorizontal: 6,
    lineHeight: 20,
    backgroundColor: STYLES.white,
  },
  approachRow: { flexDirection: 'row', alignItems: 'center' },
  clearApproachType: {
    marginLeft: 8,
    minHeight: 44,
    minWidth: 56,
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 10,
  },
});

export default FlightForm;
