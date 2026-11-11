import RecordSyncIndicator from '../components/RecordSyncIndicator';
import { subscribeAutoSync } from '../api/autoSync.mjs';
import api from '../api/axiosConfig';
import NetInfo from '@react-native-community/netinfo';
import { useFocusEffect } from '@react-navigation/native';
import RecordIssue, { reviewRecord } from '../components/RecordIssue';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ScrollView } from '../components/OverflowLists';
import { listTailnumbers, tailnumberScope } from '../storage/tailnumbers';
import React, { useCallback, useState } from 'react';
import { Alert, TouchableOpacity, View, useWindowDimensions } from 'react-native';
import Card from '../components/Card';
import Text from '../components/AppText';
import { aircraftScope, listAircraft } from '../storage/aircraft';
import { flightScope, flightStore } from '../storage/flights';
import { CATEGORY_CHOICES, CLASS_CHOICES, ENGINE_CHOICES, FLAGS, WEIGHT_CHOICES } from './fields.mjs';
import { useAppTheme } from '../theme/ThemeProvider';
import RecordActions from '../components/RecordActions';
import BottomCreateButton from '../components/BottomCreateButton';

async function aircraftUsage(scope, aircraftType) {
  const store = await flightStore();
  const [flights, tails] = await Promise.all([store.list(scope), listTailnumbers(scope)]);
  const tailnumbers = tails.filter(tail => tail.aircraft === aircraftType);
  return {
    tailnumbers,
    inUse: tailnumbers.length > 0 || flights.some(flight => flight.aircraft_type === aircraftType),
  };
}

async function serverAllowsDeletion(id, signal) {
  const response = await api.get(`/api/aircraft/${id}/deletion-eligibility/`, { signal });
  return response.data?.can_delete === true;
}

export default function AircraftDetailScreen({ route, navigation }) {
  const { styles: STYLES } = useAppTheme();
  const { width } = useWindowDimensions();
  const columns = Math.max(2, Math.min(4, Math.floor((width - 32) / 105)));
  const [item, setItem] = useState(route.params.item);
  const [usage, setUsage] = useState(null);
  const [eligibleId, setEligibleId] = useState(null);
  const tailnumbers = usage?.tailnumbers ?? [];
  const canDelete = usage?.aircraftType === item.aircraft_type && !usage.inUse
    && (!item.id || eligibleId === item.id);
  const [scope, setScope] = useState(null);
  useFocusEffect(useCallback(() => {
    setItem(route.params.item);
    setUsage(null);
    let active = true;
    const refresh = async () => {
      try {
        const account = await flightScope();
        const records = await listAircraft(account);
        const current = records.find(row => row.local_id === route.params.item.local_id || row.aircraft_type === route.params.item.aircraft_type);
        const aircraftType = current?.aircraft_type ?? route.params.item.aircraft_type;
        const usage = await aircraftUsage(account, aircraftType);
        if (await flightScope() === account && active) {
          setScope(account);
          if (current) setItem(current);
          setUsage({ ...usage, aircraftType });
        }
      } catch (error) { /* Preserve the last saved detail while unavailable. */ }
    };
    refresh();
    const timer = setInterval(refresh, 3000);
    const unsubscribe = subscribeAutoSync(event => {
      if (event === 'completed' || event === 'failed') refresh();
    });
    return () => { active = false; unsubscribe(); clearInterval(timer); };
  }, [route.params.item]));
  useFocusEffect(useCallback(() => {
    setEligibleId(null);
    if (!scope || !item.id) return;
    let request;
    const check = async (online) => {
      request?.abort();
      setEligibleId(null);
      if (!online) return;
      const controller = new AbortController();
      request = controller;
      try {
        const allowed = await serverAllowsDeletion(item.id, controller.signal);
        if (allowed && await flightScope() === scope && !controller.signal.aborted) setEligibleId(item.id);
      } catch { /* Keep Delete hidden until Django confirms eligibility. */ }
    };
    const unsubscribe = NetInfo.addEventListener(state => check(state.isConnected && state.isInternetReachable !== false));
    return () => { unsubscribe(); request?.abort(); };
  }, [scope, item.id, route.params.item]));
  const remove = async () => {
    try {
      if (!scope || await flightScope() !== scope) return;
      const records = await listAircraft(scope);
      const current = records.find(row => row.local_id === item.local_id);
      if (!current) return;
      if (current.id && !await serverAllowsDeletion(current.id)) {
        setEligibleId(null);
        Alert.alert('Aircraft is in use', 'Aircraft linked to flights, tailnumbers or imported totals cannot be deleted.');
        return;
      }
      const usage = await aircraftUsage(scope, item.aircraft_type);
      if (await flightScope() !== scope) return;
      if (usage.inUse) {
        setUsage({ ...usage, aircraftType: item.aircraft_type });
        Alert.alert('Aircraft is in use', 'Aircraft referenced by flights or tailnumbers cannot be deleted.');
        return;
      }
      await (await flightStore()).remove(aircraftScope(scope), item.local_id);
      navigation.navigate('AircraftList');
    } catch (error) {
      setEligibleId(null);
      Alert.alert('Aircraft not deleted', 'Your record is still saved. Please try again.');
    }
  };
  const update = () => navigation.navigate('AircraftForm', { item });
  return <SafeAreaView edges={['bottom']} style={{ flex: 1, paddingHorizontal: 12, backgroundColor: STYLES.itemBackground }}>
    <ScrollView style={{ flexGrow: 0, maxHeight: '65%', marginTop: 12 }}>
    <Card>
    <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12, marginBottom: 16 }}>
      <Text style={{ fontSize: 24, fontWeight: '600', flexShrink: 1 }}>{item.aircraft_type}</Text>
      <Text style={{ color: STYLES.muted }}>{tailnumbers.length} Tailnumbers</Text>
    </View>
    <Text>Category: {CATEGORY_CHOICES.find(([key]) => key === item.aircraft_category)?.[1] || 'Not set'}</Text>
    <Text style={{ marginVertical: 8 }}>Class: {CLASS_CHOICES.find(([key]) => key === item.aircraft_class)?.[1] || 'Not set'}</Text>
    {[...ENGINE_CHOICES, ...WEIGHT_CHOICES, ...FLAGS].filter(([key]) => item[key]).map(([key, label]) => <Text key={key} style={{ marginVertical: 6 }}>{label}</Text>)}
    <RecordIssue item={item} kind="aircraft" navigation={navigation} />
    <View style={{ marginTop: 2 }}>
      <RecordSyncIndicator item={item} scope={scope ? aircraftScope(scope) : undefined} />
    </View>
    <View style={{ marginTop: 8 }}>
    <Text size={14} color={STYLES.muted}>Use Update to correct this aircraft and keep its linked records.</Text>
    <RecordActions recordName="aircraft"
      onUpdate={update}
      onDelete={canDelete ? () => Alert.alert('Delete aircraft?', 'Use Update to change its details. Aircraft linked to flights, tailnumbers or imported totals cannot be deleted in the app.', [
        { text: 'Cancel', style: 'cancel' }, { text: 'Update Aircraft', onPress: update },
        { text: 'Delete', style: 'destructive', onPress: remove },
      ]) : undefined}
    />
    </View>
    </Card>
    </ScrollView>
    <Card style={{ flex: 1, marginTop: 12, marginBottom: 12 }}>
    {tailnumbers.length === 0 && <Text style={{ color: STYLES.muted }}>No tailnumbers saved for this aircraft.</Text>}
    {tailnumbers.length > 0 && <View style={{ flex: 1 }}>
      <ScrollView nestedScrollEnabled persistentScrollbar style={{ flex: 1 }}
        contentContainerStyle={{ flexDirection: 'row', flexWrap: 'wrap' }}>
        {[...tailnumbers].sort((a, b) => a.registration.localeCompare(b.registration, 'en', { numeric: true, sensitivity: 'base' })).map((tail, index) =>
          <TouchableOpacity key={tail.local_id || tail.id} accessibilityRole="button" accessibilityLabel={`View ${tail.registration}`}
            onPress={() => tail.needs_attention ? reviewRecord(navigation, 'tailnumber', tail) : navigation.navigate('TailnumberDetail', { item: tail })}
            style={{ width: `${100 / columns}%`, minHeight: 48, justifyContent: 'center', paddingHorizontal: 8, alignItems: index % columns === columns - 1 ? 'flex-end' : columns % 2 === 1 && index % columns === Math.floor(columns / 2) ? 'center' : 'flex-start' }}>
            <View style={{ maxWidth: '100%' }}>
              <Text numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.85} style={{ color: tail.needs_attention ? STYLES.danger : STYLES.blue, textAlign: index % columns === columns - 1 ? 'right' : columns % 2 === 1 && index % columns === Math.floor(columns / 2) ? 'center' : 'left' }}>{tail.registration}</Text>
              <View style={{ marginTop: 2 }}>
                <RecordSyncIndicator animate={false} item={tail} scope={scope ? tailnumberScope(scope) : undefined} />
              </View>
            </View>
            {tail.needs_attention && <Text size={11} color={STYLES.danger}>Update needed</Text>}
          </TouchableOpacity>)}
      </ScrollView>
    </View>}
    </Card>
    <BottomCreateButton title="New Tailnumber" horizontalPadding={0}
      onPress={() => navigation.navigate('AircraftTailnumberCreate', { aircraft_type: item.aircraft_type, fromAircraft: true })} />
  </SafeAreaView>;
}
