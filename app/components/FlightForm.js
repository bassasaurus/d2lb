import PrimaryActionButton from './PrimaryActionButton';
import { hasRequiredSoloLandings } from '../forms/landingRequirements.mjs';
import { nightPairWarnings } from '../forms/nightWarning.mjs';
import { FLIGHT_ROLES, PRIMARY_FLIGHT_ROLES, hasRequiredFlightRole, toggleFlightRole } from '../forms/flightRoles.mjs';
import ScrollableFormCard from './ScrollableFormCard';
import { listTailnumbers } from '../storage/tailnumbers';
import RouteInput from '../airports/RouteInput';
import { normalizeRoute, routeErrors } from '../airports/routeCheck.mjs';
import PickerOverlayHost from './PickerOverlayHost';
import DraftForm from '../drafts/DraftForm';
import { useMemo } from 'react';
import moment from "moment";
import React, { useState, useContext, useEffect, useRef } from "react";
import { View, StyleSheet, Modal, Pressable, TouchableOpacity, KeyboardAvoidingView, Platform, Button, Alert, useWindowDimensions } from 'react-native';
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

function FlightForm({ initialValues, method, onSaved, noDefaultAircraft = false, onChooseDefault, commitDateOnSelection = false }) {
  const { styles: STYLES, isDark } = useAppTheme();
  const styles = useMemo(() => createStyles(STYLES), [STYLES]);
  const { width: windowWidth, fontScale } = useWindowDimensions();
  const [roleWidth, setRoleWidth] = useState(0);
  const roleColumns = Math.max(1, Math.min(7, Math.floor((roleWidth || windowWidth - 52) / (100 * fontScale))));
  const savedNavigation = useRef(false);
  const draftHandle = useRef(null);
  const airportCheck = useRef(null);
  const [calVisible, setCalVisible] = useState(false);
  const [defaultSuggestionDismissed, setDefaultSuggestionDismissed] = useState(false);
  const [calendarDate, setCalendarDate] = useState(new Date());
  const [formCount, setFormCount] = useState(() => Math.max(0, ...initialValues.approaches.map((item, index) => item.approach_type || item.number ? index : 0)));
  const [scrollEnabled, setScrollEnabled] = useState(true);
  const [tailnumbers, setTailnumbers] = useState([]);
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
    route: yup.string().min(3).max(50).required(required).test('known-airports', 'Check the route airports.', function(value) {
      const current = airportCheck.current;
      const messages = current?.route === normalizeRoute(value) ? routeErrors(current.entries) : [];
      return messages.length ? this.createError({ message: messages.join(' ') }) : true;
    }),
    aircraft_type: yup.string().required(required),
    registration: yup.string().required(required),
    duration: yup
      .number()
      .typeError(number)
      .required(required)
      .min(0.1, "Must be greater than 0.1")
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
    night: yup.number().typeError(number).moreThan(0, "Leave blank for 0"),
    instrument: yup.number().typeError(number).moreThan(0, "Leave blank for 0"),
    simulated_instrument: yup
      .number()
      .typeError(number)
      .moreThan(0, "Leave blank for 0"),
    remarks: yup.string().max(256, "256 Character Maximum"),
    number: yup.number().typeError(number).moreThan(0, "Leave blank for 0"),
  }).test('flight-role', 'Required', function(values) {
    return hasRequiredFlightRole(values) || this.createError({ path: 'flight_role', message: 'Required' });
  }).test('solo-landings', 'Enter Day or Night landings for Solo.', function(values) {
    return hasRequiredSoloLandings(values) || this.createError({ path: 'solo_landings', message: 'Enter Day or Night landings for Solo.' });
  });

  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.select({ android: undefined, ios: "padding" })}
      keyboardVerticalOffset={Platform.select({ ios: 90, android: 78 })}
      enabled={scrollEnabled}
    >
      <PickerOverlayHost>
          <DraftForm kind="flight" recordKey={initialValues.local_id || initialValues.id || 'new'} draftHandle={draftHandle} savedNavigation={savedNavigation} onResume={values => setFormCount(Math.max(0, ...values.approaches.map((item, index) => item.approach_type || item.number ? index : 0)))}
            renderLayout={({ content, form: { values, isValid, isSubmitting, handleSubmit }, draftBlocked }) => (
              <ScrollableFormCard cardStyle={styles.container} keyboardDismissMode="on-drag"
                footer={<PrimaryActionButton testID="flight-save" title="Save" onPress={handleSubmit}
                  disabled={draftBlocked || !isValid || isSubmitting || !hasRequiredFlightRole(values) || !hasRequiredSoloLandings(values)} />}>
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
            )}
            validateOnMount={true}
            initialValues={initialValues}
            validationSchema={flightSchema}
            onSubmit={async (values, helpers) => {
              try {
                savedNavigation.current = false;
                const result = await method({ ...values, route: normalizeRoute(values.route), validate_airports: true });
                await draftHandle.current.complete();
                savedNavigation.current = true;
                helpers.resetForm({ values });
                onSaved?.(result);
              } catch (error) {
                Alert.alert("Flight not saved", "Your changes are still in this form. Please try again.");
              } finally {
                helpers.setSubmitting(false);
              }
            }}
          >
            {({
              values,
              errors,
              touched,
              handleChange,
              setFieldValue,
              setValues,
              handleBlur,
            }) => (
              <>
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
                      value={values.date.toString()}
                      onChangeText={handleChange("date")}
                      placeholder='Date'
                      onBlur={handleBlur("date")}
                    />
                  </View>
                </Pressable>
                <View>
                  {errors.date ? (
                    <Text style={styles.errors}>{errors.date}</Text>
                  ) : (
                    <View></View>
                  )}
                </View>
                <RouteInput onCheck={result => { airportCheck.current = result; }} />
                <View style={{ flexDirection: "row" }}>
                  <View style={{ flex: 0.5, marginRight: 10 }}>
                    <AircraftPicker
                      initialValue={values.aircraft_type}
                      isValid={errors.aircraft_type ? false : true}
                      style={{ flex: 0.5 }}
                      fieldName={"aircraft_type"}
                      setFieldValue={setFieldValue}
                      onBlur={handleBlur("aircraft_type")}
                    ></AircraftPicker>
                    <View>
                      {errors.aircraft_type ? (
                        <Text style={styles.errors}>
                          {errors.aircraft_type}
                        </Text>
                      ) : (
                        <View></View>
                      )}
                    </View>
                  </View>

                  <View style={{ flex: 0.5 }}>
                    {values.aircraft_type ? (
                      <>
                        <TailnumberPicker
                          initialValue={values.registration}
                          isValid={errors.registration ? false : true}
                          setFieldValue={setFieldValue}
                          filterBy={values.aircraft_type}
                          aircraftId={values.aircraft_type}
                          onBlur={handleBlur("registration")}
                          aircraft_type={values.aircraft_type}
                        ></TailnumberPicker>
                        <View>
                          {errors.registration ? (
                            <Text style={styles.errors}>
                              {errors.registration}
                            </Text>
                          ) : (
                            <View></View>
                          )}
                        </View>
                        <View>
                          {values.registration && tailnumbers.some(tail =>
                            tail.registration === values.registration && tail.aircraft !== values.aircraft_type
                          ) ? (
                            <Text style={styles.errors}>
                              Registration mismatch
                            </Text>
                          ) : (
                            <View></View>
                          )}
                        </View>
                      </>
                    ) : (
                      <View></View>
                    )}
                  </View>
                </View>
                {/* duration row */}
                <View
                  style={{
                    flexDirection: "row",
                  }}
                >
                  <View style={{ flexDirection: "column", flex: 0.7 }}>
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
                      onFocus={() => setScrollEnabled(false)}
                      onBlur={() => {
                        setScrollEnabled(true);
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
                      onFocus={() => setScrollEnabled(false)}
                      onBlur={() => setScrollEnabled(true)}
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
                </View>

                {/* end duration row */}
                <View style={[styles.approachesSection, !hasRequiredFlightRole(values) && { borderColor: STYLES.danger }]}>
                  <AppText weight="600">Flight role</AppText>
                  <View style={[styles.roleGrid, { marginTop: 0 }]}
                    onLayout={event => setRoleWidth(event.nativeEvent.layout.width)}>
                    {FLIGHT_ROLES.filter(([field]) => PRIMARY_FLIGHT_ROLES.includes(field)).map(([field, label]) => <View key={field}
                      style={[styles.checkboxContainer, { width: `${100 / (roleColumns >= 4 ? 4 : Math.min(2, roleColumns))}%` }]}>
                      <Checkbox label={label} isChecked={values[field]}
                        onPress={() => setValues(current => toggleFlightRole(current, field))} />
                    </View>)}
                  </View>
                  {!hasRequiredFlightRole(values) && <Text style={styles.errors}>Required</Text>}
                </View>
                <View style={styles.roleGrid}>
                  {FLIGHT_ROLES.filter(([field]) => !PRIMARY_FLIGHT_ROLES.includes(field)).map(([field, label]) => <View key={field}
                    style={[styles.checkboxContainer, { width: `${100 / Math.min(3, roleColumns)}%` }]}>
                    <Checkbox label={label} isChecked={values[field]}
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
                          <AppText>IFR</AppText>
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
                          <AppText>Hood</AppText>
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
                <View style={styles.approachesSection}>
                  <AppText weight="600" style={{ marginBottom: 4 }}>Approaches</AppText>
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
                    onPress={() => {
                      setFieldValue("hold", !values.hold);
                    }}
                    isChecked={values.hold}
                  ></Checkbox>
                  <View>
                    <AppText>Hold</AppText>
                  </View>
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
                          <Button title="Cancel" onPress={() => setCalVisible(false)} />
                          <Button title="Done" onPress={() => commitDate(calendarDate, setFieldValue)} />
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
    </KeyboardAvoidingView>
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
