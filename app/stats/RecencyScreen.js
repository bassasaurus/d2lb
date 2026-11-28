import { formatDate, formatDateTime } from '../formatting/dates.mjs';
import React, { useCallback, useRef, useState } from 'react';
import { ActivityIndicator, Pressable, RefreshControl, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { ScrollView } from '../components/OverflowLists';
import Card from '../components/Card';
import Text from '../components/AppText';
import { useAppTheme } from '../theme/ThemeProvider';
import api from '../api/axiosConfig';
import { flightScope, flightStore, tokenPartition } from '../storage/flights';
import { aircraftScope } from '../storage/aircraft';
import { tailnumberScope } from '../storage/tailnumberRecords.mjs';
import ReorderableSections from '../components/ReorderableSections';
import { normalizeSectionOrder } from './sectionOrder.mjs';
import { validateRecency } from './recency.mjs';

function Status({ label, value, message }) {
  const { colors } = useAppTheme();
  return <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 8 }}>
    <Text style={{ flex: 1 }}>{label}</Text>
    <Text style={{ flex: 2, textAlign: 'right', color: value.current ? colors.success : colors.danger }}>
      {message || `${value.count} / ${value.required}`}
    </Text>
  </View>;
}
function RecencySection({ title, handle, children }) {
  const [expanded, setExpanded] = useState(true);
  const { colors } = useAppTheme();
  return <Card style={{ marginBottom: 12, paddingVertical: 0 }}>
    <View style={{ flexDirection: 'row', alignItems: 'center' }}>
      <Pressable accessibilityRole="button" accessibilityState={{ expanded }} onPress={() => setExpanded(value => !value)}
        style={{ flex: 1, flexDirection: 'row', alignItems: 'center', minHeight: 48, gap: 8 }}>
        <Text size={18} weight="600" style={{ flex: 1 }}>{title}</Text>
        <MaterialCommunityIcons name={expanded ? 'chevron-up' : 'chevron-down'} color={colors.muted} size={22} />
      </Pressable>
      {handle && <View style={{ position: 'absolute', left: '50%', marginLeft: -22, top: 0 }}>
        {handle}
      </View>}
    </View>
    {expanded && <View style={{ paddingBottom: 14 }}>{children}</View>}
  </Card>;
}
function InstrumentDetails({ instrument }) {
  const { colors } = useAppTheme();
  const display = instrument.display || {
    status: instrument.status_message, tone: instrument.current ? 'success' : 'danger',
    basis: instrument.source === 'ipc' ? 'IPC' : instrument.source === 'recency' ? 'Logged approaches and holding' : '',
    approaches: `${instrument.approaches.count}/6${instrument.approaches.still_needed ? ` - Log ${instrument.approaches.still_needed} more` : ''}`,
    approach_tone: instrument.approaches.current ? 'success' : 'danger',
    holding: instrument.holding.current ? `Logged ${formatDate(instrument.holding.last_date)}` : 'Not logged',
    holding_tone: instrument.holding.current ? 'success' : 'muted',
    next_action: instrument.next_requirement?.message || 'Review logged experience.',
  };
  return <View style={{ gap: 8 }}>
    <Text weight="600" color={colors[display.tone] || colors.text}>{display.status}</Text>
    {!!display.basis && <Text color={colors.muted}>Based on {display.basis}</Text>}
    <View style={{ flexDirection: 'row', justifyContent: 'space-between', gap: 12 }}>
      <Text>Approaches</Text><Text color={colors[display.approach_tone] || colors.text}>{display.approaches}</Text>
    </View>
    {!!display.approach_dates?.length && <Text color={colors.muted} style={{ textAlign: 'right', fontSize: 13 }}>{display.approach_dates.join(' · ')}</Text>}
    <View style={{ flexDirection: 'row', justifyContent: 'space-between', gap: 12 }}>
      <Text>Holding</Text><Text color={colors[display.holding_tone] || colors.text} style={{ flex: 1, textAlign: 'right' }}>{display.holding}</Text>
    </View>
    {!!instrument.ipc_completed_date && !display.ipc_summary && <Text>Last IPC: {formatDate(instrument.ipc_completed_date)}</Text>}
    {display.ipc_summary ? <View style={{ gap: 4 }}>
      <Text weight="600">IPC</Text>
      <Text>Logged {formatDate(display.ipc_summary.logged_date)}</Text>
      <Text>Expiry {formatDate(display.ipc_summary.expiry_date)}</Text>
    </View> : <View style={{ gap: 4 }}>
      <Text weight="600">Next action</Text>
      <Text>{display.next_action}</Text>
    </View>}
    {!!display.ipc_review_from && <Text>IPC review from {formatDate(display.ipc_review_from)}</Text>}
    <Text color={colors.muted} style={{ fontSize: 12 }}>Based on logged information. Verify your records, including interception and tracking. {display.window_start ? `Counting logged experience since ${formatDate(display.window_start)}.` : ''}</Text>
  </View>;
}
function LandingStatus({ label, value }) {
  const { colors } = useAppTheme();
  if (!value.current && value.valid_through) {
    return <Status label={label} value={value} message="—" />;
  }
  return <View>
    <Status label={label} value={value}
      message={`${value.count}/3${value.still_needed ? ` · Log ${value.still_needed} more` : ''}`} />
    {!!value.last_dates?.length && <Text color={colors.muted} style={{ textAlign: 'right', fontSize: 13 }}>
      {[...value.last_dates].reverse().map(day => formatDate(day).replace(/, \d{4}$/, '')).join(' · ')}
    </Text>}
  </View>;
}
function LandingSection({ title, rows, handle }) {
  const { colors } = useAppTheme();
  return <RecencySection title={title} handle={handle}>
    {rows.map(row => <View key={row.label} style={{ paddingVertical: 8 }}>
      <Text weight="600" style={{ marginBottom: 4 }}>{row.label}</Text>
      <LandingStatus label="Day" value={row.day} />
      <LandingStatus label="Night full-stop" value={row.night} />
      <Text weight="600" style={{ marginTop: 8 }}>Currency</Text>
      {['day', 'night'].map(period => <Status key={period} label={period === 'day' ? 'Day' : 'Night'} value={row[period]}
        message={row[period].valid_through ? `${row[period].current ? 'Until' : 'Expired'} ${formatDate(row[period].valid_through)}` : 'Not current'} />)}
    </View>)}
    <Text color={colors.muted} style={{ fontSize: 12, marginTop: 8 }}>Based on logged landings. Verify takeoffs and applicable requirements. Simulator sessions excluded.</Text>
  </RecencySection>;
}
export default function RecencyScreen() {
  const { colors } = useAppTheme();
  const [snapshot, setSnapshot] = useState(null);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');
  const [pending, setPending] = useState(0);
  const [refreshKey, setRefreshKey] = useState(0);
  const [order, setOrder] = useState(normalizeSectionOrder([]));
  const [orderReady, setOrderReady] = useState(false);
  const [dragging, setDragging] = useState(false);
  const orderStorage = useRef(null);
  const orderWrites = useRef(Promise.resolve());
  const saveOrder = next => {
    setOrder(next);
    const storage = orderStorage.current;
    if (!storage) return;
    orderWrites.current = orderWrites.current.catch(() => {}).then(() => storage.store.cacheReference(storage.scope, 'recency-section-order', next));
    orderWrites.current.catch(() => {
      if (orderStorage.current === storage) setError('Section order could not be saved. Please try moving it again.');
    });
  };
  useFocusEffect(useCallback(() => {
    let active = true;
    const controller = new AbortController();
    const load = async () => {
      setRefreshing(true);
      setError('');
      setOrderReady(false);
      try {
        const partition = await tokenPartition();
        const scope = await flightScope();
        const store = await flightStore();
        const current = async () => active && await tokenPartition() === partition && await flightScope() === scope;
        await orderWrites.current.catch(() => {});
        const storedOrder = await store.reference(scope, 'recency-section-order');
        if (!await current()) return;
        orderStorage.current = { store, scope };
        setOrder(normalizeSectionOrder(storedOrder));
        setOrderReady(true);
        const cached = await store.reference(scope, 'recency');
        if (cached[0] && await current()) {
          try { setSnapshot(validateRecency(cached[0])); } catch { /* Fetch a replacement for malformed cached data. */ }
        }
        const count = await store.pendingCount(scope) + await store.pendingCount(aircraftScope(scope)) + await store.pendingCount(tailnumberScope(scope));
        if (await current()) setPending(count);
        const response = await api.get('/api/mobile/recency/', { signal: controller.signal });
        const fresh = validateRecency(response.data);
        if (!await current()) return;
        await store.cacheReference(scope, 'recency', [fresh]);
        if (await current()) setSnapshot(fresh);
      } catch (failure) {
        if (active) setError(failure.response?.status === 404
          ? 'Recency needs the matching Django API update. Pull down to retry after deployment.'
          : 'Could not refresh Recency. Any saved snapshot remains available. Pull down to retry.');
      } finally { if (active) setRefreshing(false); }
    };
    load();
    return () => { active = false; controller.abort(); orderStorage.current = null; setDragging(false); };
  }, [refreshKey]));
  return <SafeAreaView edges={['left', 'right', 'bottom']} style={{ flex: 1, backgroundColor: colors.background }}>
    <ScrollView scrollEnabled={!dragging} contentContainerStyle={{ padding: 16 }}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => setRefreshKey(key => key + 1)} />}>
      {refreshing && !snapshot && <ActivityIndicator color={colors.primary} />}
      {error ? <Text accessibilityLiveRegion="polite" style={{ color: colors.danger, marginBottom: 12 }}>{error}</Text> : null}
      {snapshot && <>
        <Text style={{ color: colors.muted, marginBottom: 16, textAlign: 'center' }}>Downloaded {formatDateTime(snapshot.downloaded_at)}</Text>
        {pending > 0 && <Text style={{ color: colors.danger, marginBottom: 16 }}>{pending} pending change(s) may not yet be included. Sync your logbook, then refresh.</Text>}
        {orderReady && <ReorderableSections order={order} onChange={saveOrder} onDragChange={setDragging}
          sections={[
            { id: 'vfr', title: 'Passenger Currency', visible: snapshot.categories.length > 0,
              render: handle => <LandingSection title="Passenger Currency" rows={snapshot.categories} handle={handle} /> },
            { id: 'ifr', title: 'IFR', visible: (snapshot.instrument_categories ?? [snapshot.instrument]).some(item => item.applicable !== false), render: handle => <RecencySection title="IFR" handle={handle}>
        {(snapshot.instrument_categories ?? [snapshot.instrument]).filter(item => item.applicable !== false).map(instrument => (
        <View key={instrument.category || 'unknown'} style={{ paddingVertical: 8 }}>
          {!!instrument.category_label && <Text weight="600">{instrument.category_label}</Text>}
          <InstrumentDetails instrument={instrument} />
        </View>
        ))}
            </RecencySection> },
            { id: 'type', title: 'Type', visible: snapshot.types.length > 0,
              render: handle => <LandingSection title="Passenger Currency by Type" rows={snapshot.types} handle={handle} /> },
          ]} />}
        {!snapshot.categories.length && !snapshot.types.length && <Text style={{ color: colors.muted }}>No applicable landing records yet.</Text>}
      </>}
    </ScrollView>
  </SafeAreaView>;
}
