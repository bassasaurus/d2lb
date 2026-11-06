import React, { useCallback, useRef, useState } from 'react';
import { ActivityIndicator, Pressable, RefreshControl, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { ScrollView } from '../components/OverflowLists';
import Text from '../components/AppText';
import { useAppTheme } from '../theme/ThemeProvider';
import api from '../api/axiosConfig';
import syncFlightData from '../api/syncFlightData';
import SyncStatusNotice from '../components/SyncStatusNotice';
import { refreshStats } from './statsRefresh.mjs';
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
function Breakdown({ row, title, fields = METRICS.slice(1), showTotal = true, arrowOnly = false, previewFields = [], bottomToggle = false }) {
  const [expanded, setExpanded] = useState(false);
  const { colors } = useAppTheme();
  const Header = bottomToggle ? View : Pressable;
  return <View style={{ backgroundColor: colors.surface, borderRadius: 10, marginBottom: arrowOnly ? 0 : 8, paddingHorizontal: arrowOnly ? 0 : 14 }}>
    <Header accessibilityRole={bottomToggle ? undefined : "button"} accessibilityLabel={arrowOnly ? (expanded ? 'Collapse details and recency' : 'Expand details and recency') : title} accessibilityState={{ expanded }} onPress={bottomToggle ? undefined : () => setExpanded(value => !value)}
      style={{ minHeight: arrowOnly ? 32 : 52, flexDirection: 'row', alignItems: 'center', justifyContent: arrowOnly ? 'flex-end' : 'flex-start', gap: 8 }}>
      {!arrowOnly && <Text weight="600" style={{ flex: 1 }}>{title}</Text>}
      {showTotal && <Text>{metricValue('total_time', row.total_time)}</Text>}
      {!bottomToggle && <MaterialCommunityIcons name={expanded ? 'chevron-up' : 'chevron-down'} color={colors.muted} size={22} />}
    </Header>
    {previewFields.length > 0 && <View style={{ paddingBottom: bottomToggle || expanded ? 0 : 12 }}>
      <Values row={row} fields={previewFields} />
    </View>}
    {bottomToggle && <Pressable accessibilityRole="button" accessibilityLabel={`${expanded ? 'Collapse' : 'Expand'} ${title} details`}
      accessibilityState={{ expanded }} onPress={() => setExpanded(value => !value)}
      style={{ minHeight: 32, alignItems: 'flex-end', justifyContent: 'center' }}>
      <MaterialCommunityIcons name={expanded ? 'chevron-up' : 'chevron-down'} color={colors.muted} size={22} />
    </Pressable>}
    {expanded && <View style={{ paddingBottom: 12 }}>
      <Values row={row} fields={fields.filter(([key]) => !previewFields.some(([previewKey]) => previewKey === key))} />
      <Text weight="600" style={{ marginTop: 12, marginBottom: 4 }}>Recency</Text>
      <Values row={row} fields={RECENCY} />
    </View>}
  </View>;
}
export default function StatsScreen() {
  const { colors } = useAppTheme();
  const [snapshot, setSnapshot] = useState(null);
  const [refreshing, setRefreshing] = useState(false);
  const [notice, setNotice] = useState({ visible: true, message: 'Checking totals…', error: false });
  const [note, setNote] = useState('Saved totals for your full logbook.');
  const [refreshKey, setRefreshKey] = useState(0);
  const refreshRef = useRef(null);
  useFocusEffect(useCallback(() => {
    let active = true;
    let noticeTimer;
    const noteTimer = setTimeout(() => { if (active) setNote(''); }, 5000);
    const controller = new AbortController();
    setNote(refreshKey ? 'Totals are calculated automatically after each record update.' : 'Saved totals for your full logbook.');
    const phase = message => { if (active) setNotice({ visible: true, message, error: false }); };
    const load = async () => {
      setRefreshing(true);
      phase('Checking totals…');
      try {
        const partition = await tokenPartition();
        const current = async () => active && await tokenPartition() === partition;
        const scope = await flightScope();
        const store = await flightStore();
        const cachedRows = await store.reference(scope, 'totals-stats');
        let cached;
        if (cachedRows[0]) {
          try { cached = validateSummary(cachedRows[0]); } catch { /* Replace invalid snapshots. */ }
        }
        if (cached && await current()) setSnapshot(cached);
        const result = await refreshStats({ store, scope, referenceScopes: value => [aircraftScope(value), tailnumberScope(value)],
          cached, sync: syncFlightData, validate: validateSummary, isCurrent: current, onPhase: phase,
          fetchSnapshot: async () => (await api.get('/api/mobile/stats/', { signal: controller.signal })).data });
        if (!result || !await current()) return;
        setSnapshot(result.snapshot);
        if (result.pending) {
          setNotice({ visible: true, error: true,
            message: `${result.pending} pending change(s). Saved totals may be out of date.\nPull down to retry.` });
        } else {
          phase('Totals are current.');
          noticeTimer = setTimeout(() => { if (active) setNotice(value => ({ ...value, visible: false })); }, 5000);
        }
      } catch (failure) {
        if (active) setNotice({ visible: true, error: true, message: failure.response?.status === 404
          ? 'Totals & Stats needs the matching Django API update.\nPull down to retry after deployment.'
          : 'Sync could not finish. Showing saved totals.\nPull down to retry.' });
      } finally { if (active) setRefreshing(false); }
    };
    refreshRef.current = () => setRefreshKey(key => key + 1);
    load();
    return () => { active = false; clearTimeout(noteTimer); clearTimeout(noticeTimer); controller.abort(); refreshRef.current = null; };
  }, [refreshKey]));
  const all = snapshot?.totals.find(row => row.total.trim().toLowerCase() === 'all');
  const categories = snapshot?.totals.filter(row => row !== all && Number(row.total_time) > 0) || [];
  return <SafeAreaView edges={['left', 'right', 'bottom']} style={{ flex: 1, backgroundColor: colors.background }}>
    <ScrollView contentContainerStyle={{ padding: 16 }}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { if (!refreshing) refreshRef.current?.(); }} />}>
      {refreshing && !snapshot && <ActivityIndicator color={colors.primary} />}
      <SyncStatusNotice visible={notice.visible} message={notice.message} error={notice.error} />
      {snapshot && <>
        <Text style={{ color: colors.muted, marginBottom: 6, textAlign: 'center' }}>Downloaded {new Date(snapshot.downloaded_at).toLocaleString()}</Text>
        {note ? <Text style={{ color: colors.muted, marginBottom: 16, textAlign: 'center' }}>{note}</Text> : null}

        {all ? <View style={{ backgroundColor: colors.surface, borderRadius: 10, paddingHorizontal: 14, paddingTop: 14, marginBottom: 20 }}>
          <Text style={{ color: colors.muted }}>Total flight time</Text>
          <Text size={34} weight="600" style={{ marginVertical: 6 }}>{metricValue('total_time', all.total_time)}</Text>
          <Values row={all} fields={METRICS.slice(1, 4)} />
          <Breakdown row={all} title="More details & recency" fields={METRICS.slice(4)} showTotal={false} arrowOnly />
        </View> : <Text style={{ marginBottom: 16 }}>No overall total available yet.</Text>}
        {categories.length > 0 && <Text size={18} weight="600" style={{ marginBottom: 10 }}>By Category and Class</Text>}
        {categories.map((row, index) => <Breakdown key={`${row.total}:${index}`} row={row} title={row.total} bottomToggle previewFields={METRICS.slice(1, 4).filter(([key]) => Number(row[key]) > 0)} />)}
        {snapshot.aircraft.length > 0 && <Text size={18} weight="600" style={{ marginTop: 16, marginBottom: 10 }}>By Type</Text>}
        {snapshot.aircraft.map((row, index) => <Breakdown key={`${row.aircraft_type}:${index}`} row={row} title={row.aircraft_type} />)}
      </>}
      {!snapshot && !refreshing && !notice.error && <Text>No summary available yet.</Text>}
    </ScrollView>
  </SafeAreaView>;
}
