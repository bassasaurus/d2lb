import React, { useCallback, useContext, useRef, useState } from 'react';
import { Alert, View } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { ScrollView } from '../components/OverflowLists';
import Card from '../components/Card';
import Text from '../components/AppText';
import PlatformActionButton from '../components/PlatformActionButton';
import { flightScope, flightStore } from '../storage/flights';
import { reviewAccess } from './reviewAccess';
import { recordTitle } from './comparison.mjs';
import { isValidationIssue, validationMessages } from './issuePresentation.mjs';
import VersionComparison from './VersionComparison';
import syncFlightData from '../api/syncFlightData';
import { useAppTheme } from '../theme/ThemeProvider';
import AppContext from '../components/AppContext';

export default function SyncConflictScreen({ route, navigation }) {
  const { colors } = useAppTheme();
  const { kind, localId } = route.params;
  const { formGuards } = useContext(AppContext);
  const [item, setItem] = useState(null);
  const [fresh, setFresh] = useState(false);
  const [busy, setBusy] = useState(false);
  const [selected, setSelected] = useState(null);
  const [message, setMessage] = useState('Loading record…');
  const refresh = useRef();
  useFocusEffect(useCallback(() => {
    let active = true;
    const load = async () => {
      setFresh(false); setBusy(true); setSelected(null);
      try {
        const access = await reviewAccess(kind);
        const local = await access.store.reviewRecord(access.scope, localId);
        await access.assertCurrent();
        if (!local?.sync_error || !local.can_resolve) {
          if (active) { setItem(null); setMessage('No action needed. Your changes will upload automatically.'); }
          return;
        }
        if (active) setItem(local);
        if (!local.id) { if (active) setMessage('Fix the record details before syncing.'); return; }
        try {
          const compared = await access.refresh(localId, local.generation, local.id);
          await access.assertCurrent();
          if (active) {
            setItem(compared); setFresh(true);
            setMessage(isValidationIssue(compared.response) ? 'Fix the record details before syncing.'
              : compared.server_record ? 'This record changed in two places. Select the version to keep.'
              : 'This record was deleted online. Choose whether to keep that deletion or save your device version as a new record.');
          }
        } catch {
          if (active) setMessage('Connect to the internet to compare both versions.');
        }
      } catch { if (active) setMessage('Could not open this record. Please try again.'); }
      finally { if (active) setBusy(false); }
    };
    refresh.current = load;
    load();
    return () => { active = false; refresh.current = null; };
  }, [kind, localId]));

  const choose = async choice => {
    setBusy(true);
    try {
      if ([...formGuards.current.values()].some(read => {
        const form = read(); return form.open || form.dirty || form.saving;
      })) throw new Error('Close any open forms before choosing a version.');
      const access = await reviewAccess(kind);
      await access.assertCurrent();
      if (kind === 'tailnumber' && choice === 'discard_local') {
        const flights = await (await flightStore()).list(await flightScope());
        if (flights.some(flight => flight.registration === item.registration)) throw new Error('Update flights using this tailnumber before discarding it.');
      }
      await access.store.resolveReview(access.scope, localId, item.generation, choice, item.server_record?.revision || null);
      navigation.goBack();
      syncFlightData().catch(() => {});
    } catch (error) { Alert.alert('Record not changed', error.message || 'Reload the comparison and try again.'); }
    finally { setBusy(false); }
  };
  const confirm = (choice, title, text) => Alert.alert(title, text, [
    { text: 'Cancel', style: 'cancel' }, { text: 'Confirm', style: 'destructive', onPress: () => choose(choice) },
  ]);
  const edit = () => navigation.getParent()?.popTo('MainDrawer', {
    screen: kind === 'flight' ? 'Logbook' : 'Aircraft',
    params: { screen: item?._default_preference ? 'AircraftList' : kind === 'aircraft' ? 'AircraftForm' : kind === 'tailnumber' ? 'TailnumberUpdate' : 'FlightUpdate', params: { item }, initial: false },
  });
  const validation = isValidationIssue(item?.response);
  const canFixDetails = item?.can_resolve && item.sync_state !== 'pending_delete' && (validation || !item.id);
  const inUse = kind === 'aircraft' && item?.sync_state === 'pending_delete' && /in use/i.test(JSON.stringify(item.response || {}));
  const localEnabled = Boolean(fresh && !validation && !inUse);
  const apply = () => {
    if (selected === 'server') {
      if (!item.server_record) confirm('use_server', 'Keep deletion?', 'The device version will be removed.');
      else choose('use_server');
    } else if (selected === 'local') {
      if (!item.server_record) choose('recreate');
      else if (item.sync_state === 'pending_delete') confirm('keep_local', 'Delete record?', 'This will delete the online record.');
      else choose('keep_local');
    }
  };
  return <ScrollView style={{ backgroundColor: colors.background }} contentContainerStyle={{ padding: 12, paddingBottom: 24 }}>
    <Card style={{ marginBottom: 12 }}>
      {item && <Text size={20} weight="600" style={{ marginBottom: 8 }}>{recordTitle(kind, item)}</Text>}
      <Text accessibilityLiveRegion="polite">{message}</Text>
      {validationMessages(item?.response).map((error, index) => <Text key={index} color={colors.danger} style={{ marginTop: 8 }}>{error}</Text>)}
    </Card>
    {item && fresh && <VersionComparison kind={kind} local={item} server={item.server_record}
      selected={selected} onSelect={setSelected} localEnabled={localEnabled && !busy} serverEnabled={!busy} />}
    {item && fresh && <View style={{ opacity: busy || !selected ? 0.45 : 1 }}>
      <PlatformActionButton title={busy ? 'Saving…' : selected === 'local' && item.sync_state === 'pending_delete' ? 'Keep deletion request' : `Choose this ${kind === 'flight' ? 'flight' : 'record'}`}
        disabled={busy || !selected} onPress={apply} />
    </View>}
    {canFixDetails && <View style={{ marginTop: 8 }}>
      <PlatformActionButton title="Fix Details" variant="text" disabled={busy} onPress={edit} />
    </View>}
    {!item?.id && item?.can_resolve && <PlatformActionButton title="Discard draft" variant="text" destructive disabled={busy}
      onPress={() => confirm('discard_local', 'Discard this draft?', 'Remove this record from your device? A recovery copy is retained.')} />}
    <PlatformActionButton title={busy ? 'Checking…' : 'Check again'} variant="text" disabled={busy} onPress={() => refresh.current?.()} />
  </ScrollView>;
}
