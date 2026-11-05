import { flightScope, flightStore } from '../storage/flights';
import React, { useCallback, useState, useContext } from 'react';
import { Alert, Button, ScrollView, View } from 'react-native';
import Text from '../components/AppText';
import { useFocusEffect } from '@react-navigation/native';
import { reviewAccess } from './reviewAccess';
import { recordTitle } from './comparison.mjs';
import VersionComparison from './VersionComparison';
import syncFlightData from '../api/syncFlightData';
import { useAppTheme } from '../theme/ThemeProvider';
import AppContext from '../components/AppContext';

export default function SyncConflictScreen({ route, navigation }) {
  const { styles: STYLES } = useAppTheme();
  const { kind, localId, historyId } = route.params;
  const { formGuards } = useContext(AppContext);
  const [item, setItem] = useState(null);
  const [fresh, setFresh] = useState(false);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('Loading comparison…');
  const refresh = React.useRef();
  useFocusEffect(useCallback(() => {
    let active = true;
    const load = async () => {
      setFresh(false);
      setBusy(true);
      try {
        const access = await reviewAccess(kind);
        if (historyId != null) {
          const saved = (await access.store.reviewHistory(access.scope)).find(row => row.id === historyId);
          if (!saved) throw new Error('Saved copy not found.');
          await access.assertCurrent();
          if (active) { setItem({ ...saved.local_record, server_record: saved.server_record, archived: true }); setMessage(`Saved copy from ${new Date(saved.created_at).toLocaleString()}.`); }
          return;
        }
        const local = await access.store.reviewRecord(access.scope, localId);
        await access.assertCurrent();
        if (!local?.sync_error) { if (active) { setItem(null); setMessage('No sync issue remains for this record.'); } return; }
        if (active) setItem(local);
        if (!local.can_resolve) { if (active) setMessage('The upload result is uncertain. Reconnect and retry before choosing another version.'); return; }
        if (!local.id) { if (active) setMessage('This local record was not accepted. Review the error, edit it, or archive and remove the local draft.'); return; }
        try {
          const compared = await access.refresh(localId, local.generation, local.id);
          if (active) { setItem(compared); setFresh(true); setMessage(compared.server_record ? 'Review both versions before choosing. A saved copy will be kept.' : 'This record is no longer on the server. Your local version is still saved.'); }
        } catch (error) {
          if (active) setMessage('Could not refresh the server version. Your local changes are safe; reconnect and try again.');
        }
      } catch (error) { if (active) setMessage(error.message || 'Unable to load comparison.'); }
      finally { if (active) setBusy(false); }
    };
    refresh.current = load;
    load();
    return () => { active = false; refresh.current = null; };
  }, [kind, localId, historyId]));

  const choose = async choice => {
    setBusy(true);
    try {
      if ([...formGuards.current.values()].some(read => {
        const form = read();
        return form.open || form.dirty || form.saving;
      })) throw new Error('Close any open create or update forms before resolving sync issues.');
      const access = await reviewAccess(kind);
      await access.assertCurrent();
      if (kind === 'tailnumber' && choice === 'discard_local') {
        const flights = await (await flightStore()).list(await flightScope());
        if (flights.some(flight => flight.registration === item.registration)) throw new Error('Update flights using this tailnumber before removing its local record.');
      }
      await access.store.resolveReview(access.scope, localId, item.generation, choice, item.server_record?.revision || null);
      navigation.goBack();
      syncFlightData().catch(() => {});
    } catch (error) { Alert.alert('Choice not applied', error.message || 'Reload the comparison and try again.'); }
    finally { setBusy(false); }
  };
  const confirm = (choice, title, text) => Alert.alert(title, text, [
    { text: 'Keep reviewing', style: 'cancel' },
    { text: 'Confirm', style: 'destructive', onPress: () => choose(choice) },
  ]);
  const edit = () => navigation.getParent()?.popTo('MainDrawer', {
    screen: kind === 'flight' ? 'Logbook' : 'Aircraft',
    params: { screen: kind === 'aircraft' ? 'AircraftForm' : kind === 'tailnumber' ? 'TailnumberUpdate' : 'FlightUpdate', params: { item }, initial: false },
  });
  const validation = item?.response && !item.response.code && !item.response.detail;
  const inUse = kind === 'aircraft' && item?.sync_state === 'pending_delete' && /in use/i.test(item.sync_error || '');
  return <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 40 }}>
    {item && <Text style={{ fontSize: 20, fontWeight: '600', marginBottom: 12 }}>{recordTitle(kind, item)}</Text>}
    <Text accessibilityLiveRegion="polite">{message}</Text>
    {item?.sync_error && <Text style={{ color: STYLES.danger, marginTop: 12 }}>{item.sync_error}</Text>}
    {item?.sync_state === 'pending_delete' && <Text style={{ marginTop: 12 }}>The local change requests deletion of this record.</Text>}
    {item && <VersionComparison kind={kind} local={item} server={item.server_record} />}
    {!item?.archived && <>
      <Button title={busy ? 'Loading…' : 'Refresh comparison'} disabled={busy} onPress={() => refresh.current?.()} />
      {item && !item.can_resolve && <View style={{ marginTop: 12 }}><Button title="Retry sync" disabled={busy} onPress={async () => {
        setBusy(true);
        try { await syncFlightData(); } catch (error) { Alert.alert('Sync could not finish', 'Your changes remain saved on this device.'); }
        finally { refresh.current?.(); }
      }} /></View>}
      {item?.can_resolve && <>
        {item.sync_state !== 'pending_delete' && <View style={{ marginTop: 12 }}><Button title="Edit local record" disabled={busy} onPress={edit} /></View>}
        {fresh && <View style={{ marginTop: 12 }}><Button title={item.server_record ? (inUse ? 'Cancel deletion' : 'Use server version') : 'Accept server deletion'} disabled={busy}
          onPress={() => confirm('use_server', item.server_record ? 'Use server version?' : 'Accept server deletion?', 'The local version will be archived before this choice is applied.')} /></View>}
        {fresh && item.server_record && !validation && !inUse && <View style={{ marginTop: 12 }}><Button title={item.sync_state === 'pending_delete' ? 'Delete latest server version' : 'Use local changes'} disabled={busy}
          onPress={() => confirm('keep_local', item.sync_state === 'pending_delete' ? 'Delete this server record?' : 'Apply local changes?', 'This queues a new attempt against the displayed server version. If it changes again, another review will be required. Both displayed versions will be archived.')} /></View>}
        {fresh && !item.server_record && item.sync_state !== 'pending_delete' && <View style={{ marginTop: 12 }}><Button title={`Save as new ${kind}`} disabled={busy}
          onPress={() => confirm('recreate', 'Save as a new record?', 'This creates a new record rather than restoring the deleted server record. A copy of these changes will be archived.')} /></View>}
        {!item.id && <View style={{ marginTop: 12 }}><Button title="Archive and remove local draft" disabled={busy} color={STYLES.danger}
          onPress={() => confirm('discard_local', 'Remove local draft?', 'The local draft will be saved under Saved copies, then removed from pending uploads.')} /></View>}
      </>}
    </>}
  </ScrollView>;
}
