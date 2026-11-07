import { FlatList } from '../components/OverflowLists';
import { tailnumberScope } from '../storage/tailnumberRecords.mjs';
import React, { useCallback, useState } from 'react';
import { Alert, Button, RefreshControl, Switch, TouchableOpacity, View } from 'react-native';
import Text from '../components/AppText';
import { useFocusEffect } from '@react-navigation/native';
import { listAircraft, aircraftScope, saveDefaultAircraft } from '../storage/aircraft';
import { selectedDefaultType } from '../storage/flightDefaults.mjs';
import { flightScope, flightStore } from '../storage/flights';
import syncFlightData from '../api/syncFlightData';
import { useAppTheme } from '../theme/ThemeProvider';
import RoundButton from '../components/RoundButton';

export default function AircraftListScreen({ navigation }) {
  const { styles: STYLES } = useAppTheme();
  const [rows, setRows] = useState([]);
  const [deletions, setDeletions] = useState([]);
  const [issueCount, setIssueCount] = useState(0);
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
        const issues = await store.errors(scope);
        const flightIssues = await store.errors(await flightScope());
        if (active) {
          setRows(records);
          setDeletions(deleted);
          setIssueCount(issues.length + flightIssues.length + (await store.errors(tailnumberScope(await flightScope()))).length);
          setStatus(`${offline ? 'Showing saved aircraft. ' : ''}${pending ? `${pending} pending change(s).` : ""}${issues.length ? ' ' + issues.map(issue => issue.message).join(' ') : ''}`);
        }
      } catch (error) { if (active) setStatus('Unable to load aircraft. Pull down to retry.'); }
      finally { running = false; if (active) setRefreshing(false); }
    };
    refresh.current = load;
    load();
    return () => { active = false; refresh.current = null; setDefaultScope(null); };
  }, []));
  return <View style={{ flex: 1, padding: 12 }}>
    {status.trim() ? <Text style={{ paddingVertical: 12 }} accessibilityLiveRegion="polite">{status}</Text> : null}
    {issueCount > 0 && <TouchableOpacity accessibilityRole="button" onPress={() => navigation.navigate('SyncReview', { screen: 'SyncReviewList' })}>
      <Text style={{ paddingVertical: 12, color: STYLES.danger }}>Resolve sync problems ({issueCount})</Text>
    </TouchableOpacity>}
    {deletions.map(item => <View key={item.local_id} style={{ marginBottom: 12 }}>
      <Text>{item.aircraft_type}: {item.sync_error || 'Deletion pending upload'}</Text>
      <Button title="Cancel deletion" onPress={async () => {
        try {
          if (item.sync_error) {
            navigation.navigate('SyncReview', { screen: 'SyncConflict', params: { kind: 'aircraft', localId: item.local_id }, initial: false });
            return;
          }
          await (await flightStore()).cancelDeletion(aircraftScope(await flightScope()), item.local_id);
          refresh.current?.();
        } catch (error) { Alert.alert('Unable to cancel deletion', error.message); }
      }} />
    </View>)}
    <FlatList data={rows} keyExtractor={item => item.local_id} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); refresh.current?.(); }} />}
      ListEmptyComponent={<Text>No aircraft saved yet. Add an aircraft or pull down while connected.</Text>}
      extraData={[defaultType, defaultScope, savingDefault]}
      renderItem={({ item }) => <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12,
        paddingVertical: 8, borderBottomWidth: 1, borderColor: STYLES.grey }}>
        <TouchableOpacity accessibilityRole="button" style={{ flex: 1, paddingVertical: 8, minHeight: 56 }}
          onPress={() => navigation.navigate('AircraftDetail', { item })}>
          <Text style={{ color: STYLES.blue, fontSize: 18, fontWeight: '600' }}>{item.aircraft_type}</Text>
          <Text>{item.aircraft_class || 'Class not set'}{item.sync_state !== 'synced' ? ' · Pending upload' : ''}</Text>
          {item.sync_error && <Text style={{ color: STYLES.danger }}>{item.sync_error}</Text>}
        </TouchableOpacity>
        <View style={{ alignItems: 'center' }}>
          <Text size={12} style={{ color: STYLES.muted }}>Default</Text>
          <Switch accessibilityLabel={`Use ${item.aircraft_type} by default for new flights`}
            value={defaultType === item.aircraft_type} disabled={!defaultScope || savingDefault}
            onValueChange={enabled => changeDefault(item, enabled)} />
        </View>
      </View>} />
    <RoundButton buttonSize={60} buttonColor={STYLES.green} onPress={() => navigation.navigate('AircraftForm')} />
  </View>;
}
