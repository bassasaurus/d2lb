import RecordIssue, { reviewRecord } from '../components/RecordIssue';
import { FlatList } from '../components/OverflowLists';
import { tailnumberScope } from '../storage/tailnumberRecords.mjs';
import React, { useCallback, useState } from 'react';
import { Alert, RefreshControl, Switch, TouchableOpacity, View } from 'react-native';
import Card from '../components/Card';
import Text from '../components/AppText';
import { useFocusEffect } from '@react-navigation/native';
import { listAircraft, aircraftScope, saveDefaultAircraft } from '../storage/aircraft';
import { selectedDefaultType } from '../storage/flightDefaults.mjs';
import { flightScope, flightStore } from '../storage/flights';
import syncFlightData from '../api/syncFlightData';
import { useAppTheme } from '../theme/ThemeProvider';
import BottomCreateButton from '../components/BottomCreateButton';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function AircraftListScreen({ navigation }) {
  const { styles: STYLES } = useAppTheme();
  const [rows, setRows] = useState([]);
  const [deletions, setDeletions] = useState([]);
  const [defaultIssue, setDefaultIssue] = useState(null);
  const [status, setStatus] = useState('Loading saved aircraft…');
  const [refreshing, setRefreshing] = useState(false);
  const refresh = React.useRef();
  const [defaultType, setDefaultType] = useState('');
  const [defaultScope, setDefaultScope] = useState(null);
  const [savingDefault, setSavingDefault] = useState(false);
  const defaultBusy = React.useRef(false);
  const defaultVersion = React.useRef(0);
  const changeDefault = async (item, enabled) => {
    if (!defaultScope || defaultBusy.current) return;
    defaultBusy.current = true;
    defaultVersion.current++;
    setSavingDefault(true);
    try {
      if (await flightScope() !== defaultScope) return;
      const type = enabled ? item.aircraft_type : '';
      await saveDefaultAircraft(type);
      if (await flightScope() === defaultScope) { setDefaultType(type); setRows(await listAircraft()); }
      refresh.current?.();
    } catch {
      Alert.alert('Default not saved', 'Please try again.');
    } finally {
      defaultBusy.current = false;
      setSavingDefault(false);
    }
  };
  useFocusEffect(useCallback(() => {
    let active = true;
    let running = false;
    const loadDefault = async () => {
      const version = defaultVersion.current;
      const scope = await flightScope();
      const records = await (await flightStore()).list(aircraftScope(scope));
      if (active && !defaultBusy.current && version === defaultVersion.current && await flightScope() === scope) {
        setDefaultType(selectedDefaultType(records));
        setDefaultIssue(records.find(row => row._default_preference && row.needs_attention) || null);
        setDefaultScope(scope);
      }
    };
    const load = async () => {
      if (running) return;
      running = true;
      try {
        const local = await listAircraft();
        if (active) setRows(local);
        await loadDefault();
        let offline = false;
        try { await syncFlightData(); } catch (error) { offline = true; }
        const records = await listAircraft();
        await loadDefault();
        const store = await flightStore();
        const scope = aircraftScope(await flightScope());
        const pending = await store.pendingCount(scope) + await store.pendingCount(tailnumberScope(await flightScope()));
        const deleted = await store.deletedRecords(scope);
        if (active) {
          setRows(records);
          setDeletions(deleted.filter(row => row.needs_attention));
          setStatus(offline || pending ? 'Saved on this device.' : '');
        }
      } catch (error) { if (active) setStatus('Unable to load aircraft. Pull down to retry.'); }
      finally { running = false; if (active) setRefreshing(false); }
    };
    refresh.current = load;
    load();
    return () => { active = false; refresh.current = null; setDefaultScope(null); };
  }, []));
  return <SafeAreaView edges={['left', 'right', 'bottom']} style={{ flex: 1, paddingHorizontal: 12, paddingTop: 12, backgroundColor: STYLES.itemBackground }}>
    {status.trim() ? <Text style={{ paddingVertical: 12 }} accessibilityLiveRegion="polite">{status}</Text> : null}
    {defaultIssue && <Card compact style={{ marginBottom: 6 }}>
      <Text weight="600">Default aircraft</Text>
      <RecordIssue item={defaultIssue} kind="aircraft" navigation={navigation} />
    </Card>}
    {deletions.map(item => <Card compact key={item.local_id} style={{ marginBottom: 6 }}>
      <Text>{item.aircraft_type} · Deletion requested</Text>
      <RecordIssue item={item} kind="aircraft" navigation={navigation} />
    </Card>)}
    <FlatList data={rows} keyExtractor={item => item.local_id} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); refresh.current?.(); }} />}
      ListEmptyComponent={<Text>No aircraft saved yet. Add an aircraft or pull down while connected.</Text>}
      extraData={[defaultType, defaultScope, savingDefault]}
      renderItem={({ item }) => <Card compact style={{ flexDirection: 'row', alignItems: 'center', gap: 12,
        marginBottom: 6 }}>
        <TouchableOpacity accessibilityRole="button" style={{ flex: 1, paddingVertical: 4, minHeight: 48 }}
          onPress={() => item.needs_attention ? reviewRecord(navigation, 'aircraft', item) : navigation.navigate('AircraftDetail', { item })}>
          <Text style={{ color: STYLES.blue, fontSize: 18, fontWeight: '600' }}>{item.aircraft_type}</Text>
          <Text>{item.aircraft_class || 'Class not set'}{item.sync_state !== 'synced' && !item.needs_attention ? ' · Saved on device' : ''}</Text>
          <RecordIssue item={item} kind="aircraft" navigation={navigation} />
        </TouchableOpacity>
        <View style={{ alignItems: 'center' }}>
          <Text size={12} style={{ color: STYLES.muted }}>Default</Text>
          <Switch trackColor={{ false: STYLES.grey, true: STYLES.blue }} ios_backgroundColor={STYLES.grey} accessibilityLabel={`Use ${item.aircraft_type} by default for new flights`}
            value={defaultType === item.aircraft_type} disabled={!defaultScope || savingDefault}
            onValueChange={enabled => changeDefault(item, enabled)} />
        </View>
      </Card>} />
    <BottomCreateButton title="New Aircraft" horizontalPadding={0} onPress={() => navigation.navigate('AircraftForm')} />
  </SafeAreaView>;
}
