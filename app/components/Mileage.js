import React, { useCallback, useState } from 'react';
import { Pressable, View } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import AppText from './AppText';
import { useAppTheme } from '../theme/ThemeProvider';
import api from '../api/axiosConfig';
import { flightScope, flightStore } from '../storage/flights';
import { distanceUnits, formatMileage } from '../maps/mileage.mjs';

export default function Mileage({ flight }) {
  const { colors } = useAppTheme();
  const [unit, setUnit] = useState('nm');
  const [busy, setBusy] = useState(true);
  const [error, setError] = useState('');
  useFocusEffect(useCallback(() => {
    let active = true;
    setBusy(true);
    (async () => {
      try {
        const scope = await flightScope();
        const store = await flightStore();
        const cached = (await store.reference(scope, 'distance-preference'))[0];
        if (active) setUnit(distanceUnits[cached?.unit] ? cached.unit : 'nm');
        const { data } = await api.get('/api/mobile/distance-preference/');
        if (active && distanceUnits[data.unit]) {
          setUnit(data.unit);
          await store.cacheReference(scope, 'distance-preference', [data]);
        }
      } catch {
        // The cached account preference remains usable while offline.
      } finally {
        if (active) setBusy(false);
      }
    })();
    return () => { active = false; };
  }, []));

  const choose = async next => {
    setBusy(true);
    setError('');
    try {
      const scope = await flightScope();
      const { data } = await api.put('/api/mobile/distance-preference/', { unit: next });
      setUnit(data.unit);
      await (await flightStore()).cacheReference(scope, 'distance-preference', [data]);
    } catch {
      setError('Could not save units. Reconnect and try again.');
    } finally {
      setBusy(false);
    }
  };
  return <View style={{ marginBottom: 5 }}>
    <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 8 }}>
      <AppText size={16}>{flight.sync_state?.startsWith('pending_') ? 'Mileage available after sync' : formatMileage(flight.distance_nm, unit)}</AppText>
      <View style={{ flexDirection: 'row', gap: 2, backgroundColor: colors.background, padding: 2, borderRadius: 8 }} accessibilityLabel="Distance units">
        {Object.entries(distanceUnits).map(([key, value]) => <Pressable key={key} accessibilityRole="button"
          accessibilityLabel={`Distance in ${value.label}`} accessibilityState={{ selected: unit === key, disabled: busy }}
          disabled={busy} onPress={() => choose(key)}
          style={{ minHeight: 44, minWidth: 44, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 8, borderRadius: 6,
            backgroundColor: unit === key ? colors.surface : 'transparent', opacity: busy ? 0.5 : 1 }}>
          <AppText size={14} color={unit === key ? colors.primary : colors.text}>{value.label}</AppText>
        </Pressable>)}
      </View>
    </View>
    {!!error && <AppText size={14} color={colors.danger}>{error}</AppText>}
  </View>;
}
