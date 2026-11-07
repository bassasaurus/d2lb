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
function LandingSection({ title, rows, handle }) {
  const { colors } = useAppTheme();
  return <RecencySection title={title} handle={handle}>
    {rows.map(row => <View key={row.label} style={{ paddingVertical: 8 }}>
      <Text weight="600" style={{ marginBottom: 4 }}>{row.label}</Text>
      <Status label="Day landings" value={row.day} />
      <Status label="Night landings" value={row.night} />
    </View>)}
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
        <Text style={{ color: colors.muted, marginBottom: 6, textAlign: 'center' }}>Downloaded {new Date(snapshot.downloaded_at).toLocaleString()}</Text>
        <Text style={{ color: colors.muted, marginBottom: 16 }}>Calculated by the server as of {snapshot.as_of}. Refresh for current values.</Text>
        {pending > 0 && <Text style={{ color: colors.danger, marginBottom: 16 }}>{pending} pending change(s) may not yet be included. Sync your logbook, then refresh.</Text>}
        {orderReady && <ReorderableSections order={order} onChange={saveOrder} onDragChange={setDragging}
          sections={[
            { id: 'vfr', title: 'VFR', visible: snapshot.categories.length > 0,
              render: handle => <LandingSection title="VFR" rows={snapshot.categories} handle={handle} /> },
            { id: 'ifr', title: 'IFR', render: handle => <RecencySection title="IFR" handle={handle}>
        <View style={{ paddingVertical: 8 }}>
          <Status label="Approaches" value={snapshot.instrument.approaches}
            message={snapshot.instrument.approaches.current
              ? `${snapshot.instrument.approaches.count}/6 - Current until ${snapshot.instrument.approaches.until || '—'}`
              : `${snapshot.instrument.approaches.count}/6 - ${snapshot.instrument.approaches.still_needed} Still needed${snapshot.instrument.approaches.until ? ` by ${snapshot.instrument.approaches.until}` : ''}`} />
          <Status label="Holding" value={snapshot.instrument.holding}
            message={snapshot.instrument.holding.current
              ? `${snapshot.instrument.holding.count}/1 - Last hold on ${snapshot.instrument.holding.last_date || '—'}`
              : 'None in last 6 months'} />
        </View>
            </RecencySection> },
            { id: 'type', title: 'Type', visible: snapshot.types.length > 0,
              render: handle => <LandingSection title="Type" rows={snapshot.types} handle={handle} /> },
          ]} />}
        {!snapshot.categories.length && !snapshot.types.length && <Text style={{ color: colors.muted }}>No applicable landing records yet.</Text>}
      </>}
    </ScrollView>
  </SafeAreaView>;
}
