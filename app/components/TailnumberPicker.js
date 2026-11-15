import { listTailnumbers } from '../storage/tailnumbers';
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Keyboard, Pressable, View } from 'react-native';
import { useFocusEffect, useNavigation, useRoute } from '@react-navigation/native';
import AppText from './AppText';
import AppTextInput from './AppTextInput';
import RegistrationScanButton from '../ocr/RegistrationScanButton';
import { createdTailnumberSelection, normalizeRegistration, scannedTailnumber } from '../ocr/registrationCandidates.mjs';
import { usePickerOverlay } from './PickerOverlayHost';
import { useAppTheme } from '../theme/ThemeProvider';
import { tailnumberSuggestions } from './tailnumberSuggestions.mjs';

export default function TailnumberPicker({ initialValue, setFieldValue, aircraftId, isValid, aircraft_type, onBlur, beforeCreate, onScanBusyChange }) {
  const { colors } = useAppTheme();
  const navigation = useNavigation();
  const route = useRoute();
  const overlay = usePickerOverlay();
  const anchor = useRef(null);
  const [data, setData] = useState([]);
  const [visible, setVisible] = useState(false);
  const [query, setQuery] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [navigationError, setNavigationError] = useState(null);
  const blurTimer = useRef(null);
  const previousAircraft = useRef(aircraftId);
  useEffect(() => {
    if (previousAircraft.current !== aircraftId) {
      previousAircraft.current = aircraftId;
      setQuery(null);
      setVisible(false);
      setFieldValue('registration', '');
    }
  }, [aircraftId, setFieldValue]);
  useEffect(() => { if (initialValue) setQuery(null); }, [initialValue]);
  useEffect(() => {
    const subscription = Keyboard.addListener('keyboardDidHide', () => setVisible(false));
    return () => { clearTimeout(blurTimer.current); subscription.remove(); overlay.hide(); };
  }, [overlay]);
  useFocusEffect(React.useCallback(() => {
    let active = true;
    setLoading(true);
    setError(false);
    (async () => {
      const rows = await listTailnumbers();
      if (active) { setData(rows); setLoading(false); }
    })().catch(() => { if (active) { setError(true); setLoading(false); } });
    return () => { active = false; };
  }, []));
  const created = route.params?.createdTailnumber;
  useFocusEffect(React.useCallback(() => {
    if (!created) return;
    const selection = createdTailnumberSelection(created, aircraftId);
    if (selection) {
      setFieldValue('registration', selection);
      setQuery(null);
    }
    navigation.setParams({ createdTailnumber: undefined });
  }, [created, aircraftId, navigation, setFieldValue]));
  async function addTailnumber(registration = '') {
    close();
    setNavigationError(null);
    await beforeCreate?.();
    navigation.navigate('TailnumberCreate', { aircraft_type, registration,
      returnToFlight: { key: route.key, stackKey: navigation.getState().key } });
  }
  async function selectScanned(registration) {
    const rows = await listTailnumbers();
    const match = scannedTailnumber(rows, registration, aircraftId);
    if (match.kind === 'existing') {
      setData(rows);
      setFieldValue('registration', match.item.registration);
      setQuery(null);
      close();
    } else if (match.kind === 'new') {
      await addTailnumber(registration);
    } else {
      throw new Error('Choose a tailnumber for this aircraft.');
    }
  }
  const text = query ?? initialValue ?? '';
  const suggestions = useMemo(() => tailnumberSuggestions(data, aircraftId, text), [data, aircraftId, text]);
  function close() {
    clearTimeout(blurTimer.current);
    setVisible(false);
    Keyboard.dismiss();
  }
  const results = <View style={{ borderWidth: 1, borderColor: colors.border, borderRadius: 5, backgroundColor: colors.surface }}>
      {loading || error ? <AppText style={{ padding: 10, color: error ? colors.danger : colors.muted }}>
        {error ? 'Could not load saved tailnumbers. Reopen this screen to retry.' : 'Loading tailnumbers…'}
      </AppText> : <>
        {suggestions.rows.map(item => <Pressable key={item.local_id || String(item.id)} accessibilityRole="button"
          accessibilityLabel={`Select ${item.registration}`} onPress={() => {
            setFieldValue('registration', item.registration);
            setQuery(null);
            close();
          }} style={{ paddingHorizontal: 10, minHeight: 44, justifyContent: 'center', borderBottomWidth: 1, borderBottomColor: colors.border }}>
          <AppText style={{ color: colors.primary }}>{item.registration}</AppText>
        </Pressable>)}
        {!suggestions.total && <AppText style={{ padding: 10, color: colors.muted }}>No matching tailnumbers for this aircraft.</AppText>}
        <Pressable accessibilityRole="button" onPress={() => {
          addTailnumber(normalizeRegistration(text)).catch(() => { setNavigationError('Couldn’t save your unfinished flight. Keep this form open and try again.'); });
        }} style={{ padding: 10, minHeight: 44, justifyContent: 'center' }}>
          <AppText style={{ color: colors.success }}>+ Add tailnumber</AppText>
        </Pressable>
      </>}
    </View>;
  useEffect(() => {
    let active = true;
    if (visible) anchor.current?.measureInWindow((x, y, width, height) => {
      if (active) overlay.show({ x, y, width, height }, results, close);
    });
    else overlay.hide();
    return () => { active = false; };
  }, [visible, suggestions, loading, error, colors, overlay]);
  return <View ref={anchor} collapsable={false} style={{ flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', paddingTop: 10 }}>
    <View style={{ flex: 1 }}><AppTextInput style={{ marginTop: 0 }} testID="tailnumber-input" isValid={isValid} value={text} placeholder="Tailnumber" autoCapitalize="characters" autoCorrect={false}
      accessibilityLabel="Tailnumber" autoComplete="off" maxLength={10}
      onFocus={() => { clearTimeout(blurTimer.current); setVisible(true); }}
      onChangeText={value => {
        setQuery(value.toUpperCase().replace(/\s/g, ''));
        setFieldValue('registration', '');
        setVisible(true);
      }}
      onBlur={event => {
        onBlur?.(event);
        // Allow a suggestion's press to complete before removing its row.
        blurTimer.current = setTimeout(() => setVisible(false), 180);
      }} /></View>
    <RegistrationScanButton aircraft={aircraftId} tailnumbers={data} beforeCapture={beforeCreate}
      onConfirm={selectScanned} onBusyChange={onScanBusyChange} onOpen={close} />
    {navigationError && <AppText accessibilityLiveRegion="polite" style={{ color: colors.danger, flexBasis: '100%', marginTop: 6 }}>{navigationError}</AppText>}
  </View>;
}
