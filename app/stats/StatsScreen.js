import React, { useCallback, useState } from 'react';
import { ActivityIndicator, Pressable, RefreshControl, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { ScrollView } from '../components/OverflowLists';
import Text from '../components/AppText';
import { useAppTheme } from '../theme/ThemeProvider';
import api from '../api/axiosConfig';
import { flightScope, flightStore, tokenPartition } from '../storage/flights';
import { aircraftScope } from '../storage/aircraft';
import { tailnumberScope } from '../storage/tailnumberRecords.mjs';
import { METRICS, RECENCY, metricValue, validateSummary } from './summary.mjs';

function Values({ row, fields }) {
  const { colors } = useAppTheme();
  return fields.map(([key, label]) => <View key={key}
    style={{ flexDirection: 'row', justifyContent: 'space-between', gap: 12, paddingVertical: 5 }}>
    <Text style={{ flex: 1, color: colors.muted }}>{label}</Text>
    <Text style={{ fontVariant: ['tabular-nums'] }}>{metricValue(key, row[key])}</Text>
  </View>);
}
function Breakdown({ row, title, fields = METRICS.slice(1), showTotal = true, arrowOnly = false }) {
  const [expanded, setExpanded] = useState(false);
  const { colors } = useAppTheme();
  return <View style={{ backgroundColor: colors.surface, borderRadius: 10, marginBottom: arrowOnly ? 0 : 8, paddingHorizontal: 14 }}>
    <Pressable accessibilityRole="button" accessibilityLabel={arrowOnly ? (expanded ? 'Collapse details and recency' : 'Expand details and recency') : title} accessibilityState={{ expanded }} onPress={() => setExpanded(value => !value)}
      style={{ minHeight: arrowOnly ? 32 : 52, flexDirection: 'row', alignItems: 'center', justifyContent: arrowOnly ? 'center' : 'flex-start', gap: 8 }}>
      {!arrowOnly && <Text weight="600" style={{ flex: 1 }}>{title}</Text>}
      {showTotal && <Text>{metricValue('total_time', row.total_time)}</Text>}
      <MaterialCommunityIcons name={expanded ? 'chevron-up' : 'chevron-down'} color={colors.muted} size={22} />
    </Pressable>
    {expanded && <View style={{ paddingBottom: 12 }}>
      <Values row={row} fields={fields} />
      <Text weight="600" style={{ marginTop: 12, marginBottom: 4 }}>Recency</Text>
      <Values row={row} fields={RECENCY} />
    </View>}
  </View>;
}
export default function StatsScreen() {
  const { colors } = useAppTheme();
  const [snapshot, setSnapshot] = useState(null);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');
  const [pending, setPending] = useState(0);
  const [refreshKey, setRefreshKey] = useState(0);
  useFocusEffect(useCallback(() => {
    let active = true;
    const controller = new AbortController();
    const load = async () => {
      setRefreshing(true);
      setError('');
      try {
        const partition = await tokenPartition();
        const scope = await flightScope();
        const store = await flightStore();
        const current = async () => active && await tokenPartition() === partition && await flightScope() === scope;
        const cached = await store.reference(scope, 'totals-stats');
        if (cached[0] && await current()) {
          try { setSnapshot(validateSummary(cached[0])); } catch { /* Fetch a replacement for malformed cached data. */ }
        }
        const count = await store.pendingCount(scope) + await store.pendingCount(aircraftScope(scope)) + await store.pendingCount(tailnumberScope(scope));
        if (await current()) setPending(count);
        const response = await api.get('/api/mobile/stats/', { signal: controller.signal });
        const fresh = validateSummary(response.data);
        if (!await current()) return;
        await store.cacheReference(scope, 'totals-stats', [fresh]);
        if (await current()) setSnapshot(fresh);
      } catch (failure) {
        if (active) setError(failure.response?.status === 404
          ? 'Totals & Stats needs the matching Django API update. Pull down to retry after deployment.'
          : 'Could not refresh Totals & Stats. Any saved summary remains available. Pull down to retry.');
      } finally { if (active) setRefreshing(false); }
    };
    load();
    return () => { active = false; controller.abort(); };
  }, [refreshKey]));
  const all = snapshot?.totals.find(row => row.total.trim().toLowerCase() === 'all');
  const categories = snapshot?.totals.filter(row => row !== all && Number(row.total_time) > 0) || [];
  return <SafeAreaView edges={['left', 'right', 'bottom']} style={{ flex: 1, backgroundColor: colors.background }}>
    <ScrollView contentContainerStyle={{ padding: 16 }}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => setRefreshKey(key => key + 1)} />}>
      {refreshing && !snapshot && <ActivityIndicator color={colors.primary} />}
      {error ? <Text accessibilityLiveRegion="polite" style={{ color: colors.danger, marginBottom: 12 }}>{error}</Text> : null}
      {snapshot && <>
        <Text style={{ color: colors.muted, marginBottom: 6 }}>Downloaded {new Date(snapshot.downloaded_at).toLocaleString()}</Text>
        <Text style={{ color: colors.muted, marginBottom: 16 }}>Server totals for your full logbook.</Text>
        {pending > 0 && <Text style={{ color: colors.danger, marginBottom: 16 }}>{pending} pending change(s) may not yet be included. Sync your logbook, then refresh.</Text>}
        {all ? <View style={{ backgroundColor: colors.surface, borderRadius: 10, paddingHorizontal: 14, paddingTop: 14, marginBottom: 20 }}>
          <Text style={{ color: colors.muted }}>Total flight time</Text>
          <Text size={34} weight="600" style={{ marginVertical: 6 }}>{metricValue('total_time', all.total_time)}</Text>
          <Values row={all} fields={METRICS.slice(1, 4)} />
          <Breakdown row={all} title="More details & recency" fields={METRICS.slice(4)} showTotal={false} arrowOnly />
        </View> : <Text style={{ marginBottom: 16 }}>No overall total available yet.</Text>}
        {categories.length > 0 && <Text size={18} weight="600" style={{ marginBottom: 10 }}>By Category and Class</Text>}
        {categories.map((row, index) => <Breakdown key={`${row.total}:${index}`} row={row} title={row.total} />)}
        {snapshot.aircraft.length > 0 && <Text size={18} weight="600" style={{ marginTop: 16, marginBottom: 10 }}>By Type</Text>}
        {snapshot.aircraft.map((row, index) => <Breakdown key={`${row.aircraft_type}:${index}`} row={row} title={row.aircraft_type} />)}
      </>}
      {!snapshot && !refreshing && !error && <Text>No summary available yet.</Text>}
    </ScrollView>
  </SafeAreaView>;
}
