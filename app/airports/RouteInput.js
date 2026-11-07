import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Platform, Pressable, TextInput, View } from 'react-native';
import { useFormikContext } from 'formik';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Text from '../components/AppText';
import { useAppTheme } from '../theme/ThemeProvider';
import api from '../api/axiosConfig';
import { flightScope } from '../storage/flights';
import { session } from '../auth/session';
import { applyAirportChoices, createAirportChecker, normalizeRoute, routeErrors } from './routeCheck.mjs';

const check = createAirportChecker({
  get: async route => (await api.get('/api/mobile/route-airport-check/', { params: { route } })).data,
  storage: AsyncStorage,
});
export default function RouteInput({ onCheck }) {
  const { values, errors, setFieldValue, handleBlur, validateField } = useFormikContext();
  const { colors, isDark } = useAppTheme();
  const route = normalizeRoute(values.route);
  const [result, setResult] = useState(null);
  const [checking, setChecking] = useState(false);
  const notify = useRef(onCheck);
  notify.current = onCheck;
  useEffect(() => {
    let active = true;
    const auth = session.snapshot();
    setResult(null);
    notify.current(null);
    if (!route) { setChecking(false); return; }
    setChecking(true);
    const timer = setTimeout(async () => {
      try {
        const scope = await flightScope();
        const response = await check(route, scope);
        if (active && session.snapshot().version === auth.version) setResult(response);
      } catch {
        if (active) setResult({ route, entries: [], offline: true });
      } finally { if (active) setChecking(false); }
    }, 450);
    return () => { active = false; clearTimeout(timer); };
  }, [route]);
  const entries = useMemo(() => result?.route === route ? applyAirportChoices(route, result.entries, values.route_airport_choices) : [],
    [result, route, values.route_airport_choices]);
  useEffect(() => {
    notify.current({ route, entries });
    validateField('route');
  }, [route, entries, validateField]);
  const invalid = new Set(entries.filter(entry => ['unknown', 'ambiguous'].includes(entry.status)).map(entry => entry.code));
  const messages = routeErrors(entries);
  return <View>
    <TextInput testID="flight-route" accessibilityLabel="Route" placeholder="Route" placeholderTextColor={colors.placeholder}
      autoCapitalize="characters" autoCorrect={false} keyboardAppearance={isDark ? 'dark' : 'light'}
      onChangeText={value => {
        setFieldValue('route', normalizeRoute(value));
        setFieldValue('route_airport_choices', {});
      }} onBlur={handleBlur('route')} maxLength={50} selectionColor={colors.primary}
      style={{ height: Platform.OS === 'android' ? undefined : 40, minHeight: 40,
        paddingVertical: Platform.OS === 'android' ? 8 : undefined, textAlignVertical: 'center', marginTop: 10, borderWidth: 1, borderRadius: 5, paddingHorizontal: 10,
        textAlign: 'left', backgroundColor: colors.surface, color: colors.text, borderColor: invalid.size || errors.route ? colors.danger : colors.border }}>
      <Text>{route.split(/([^A-Z0-9]+)/).map((part, index) => <Text key={index} style={{ color: invalid.has(part) ? colors.danger : colors.text }}>{part}</Text>)}</Text>
    </TextInput>
    {messages.map((message, index) => <Text key={index} style={{ color: colors.danger, fontSize: 12, marginTop: 4 }}>{message}</Text>)}
    {errors.route && !messages.length && <Text style={{ color: colors.danger, fontSize: 12 }}>{errors.route}</Text>}
    {checking && <Text style={{ color: colors.muted, fontSize: 12 }}>Checking airports…</Text>}
    {!checking && route && (result?.offline || entries.some(entry => entry.status === 'pending')) &&
      <Text style={{ color: colors.muted, fontSize: 12 }}>Airport check pending—will verify when online. Previously checked codes use the saved cache.</Text>}
    {entries.filter(entry => entry.status === 'ambiguous').map(entry => <View key={entry.position} style={{ marginTop: 6 }}>
      {entry.candidates.map(airport => <Pressable key={airport.id} accessibilityRole="button" onPress={() => setFieldValue('route_airport_choices', {
        route, airports: { ...(values.route_airport_choices?.route === route ? values.route_airport_choices.airports : {}), [entry.position]: airport.id },
      })} style={{ padding: 10, marginBottom: 4, borderWidth: 1, borderColor: colors.border, borderRadius: 5 }}>
        <Text style={{ color: colors.primary, fontSize: 13 }}>{airport.label}</Text>
      </Pressable>)}
    </View>)}
  </View>;
}
