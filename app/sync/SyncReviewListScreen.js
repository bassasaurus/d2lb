import React, { useCallback, useState } from 'react';
import { Button, FlatList, RefreshControl, Text, TouchableOpacity, View } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { reviewAccess } from './reviewAccess';
import { recordTitle } from './comparison.mjs';
import { STYLES } from '../styles/styles';

export default function SyncReviewListScreen({ navigation }) {
  const [rows, setRows] = useState([]);
  const [history, setHistory] = useState([]);
  const [savedCopies, setSavedCopies] = useState(false);
  const [status, setStatus] = useState('Loading saved sync issues…');
  const [refreshing, setRefreshing] = useState(false);
  const refresh = React.useRef();
  useFocusEffect(useCallback(() => {
    let active = true;
    const load = async () => {
      try {
        const pending = [];
        const archives = [];
        for (const kind of ['flight', 'aircraft']) {
          const { store, scope, assertCurrent } = await reviewAccess(kind);
          pending.push(...(await store.reviewList(scope)).map(item => ({ ...item, kind })));
          archives.push(...(await store.reviewHistory(scope)).map(item => ({ ...item, kind })));
          await assertCurrent();
        }
        if (active) {
          if (!pending.length) {
            navigation.getParent()?.goBack();
            return;
          }
          setRows(pending);
          setHistory(archives.sort((a, b) => b.created_at.localeCompare(a.created_at)));
          setStatus(pending.length ? 'Choose a record to review. Unsynced changes remain saved on this device.' : 'No sync issues need review.');
        }
      } catch (error) { if (active) setStatus('Unable to load sync review. Please try again.'); }
      finally { if (active) setRefreshing(false); }
    };
    refresh.current = load;
    load();
    return () => { active = false; refresh.current = null; };
  }, [navigation]));
  return <View style={{ flex: 1, padding: 16 }}>
    <Text accessibilityLiveRegion="polite" style={{ marginBottom: 12 }}>{status}</Text>
    <Button title={savedCopies ? 'Show unresolved issues' : `Saved copies (${history.length})`} onPress={() => setSavedCopies(value => !value)} />
    <FlatList data={savedCopies ? history : rows} keyExtractor={item => `${item.kind}:${savedCopies ? item.id : item.local_id}`}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); refresh.current?.(); }} />}
      ListEmptyComponent={<Text style={{ marginTop: 20 }}>{savedCopies ? 'Copies are saved here when you resolve an issue.' : 'Your pending uploads will retry when the app is connected.'}</Text>}
      renderItem={({ item }) => <TouchableOpacity accessibilityRole="button" style={{ paddingVertical: 16, borderBottomWidth: 1, borderColor: '#ddd' }}
        onPress={() => navigation.navigate('SyncConflict', { kind: item.kind, localId: item.local_id, historyId: savedCopies ? item.id : undefined })}>
        <Text style={{ color: STYLES.blue, fontSize: 16, fontWeight: '600' }}>{recordTitle(item.kind, savedCopies ? item.local_record : item)}</Text>
        <Text>{savedCopies ? `Saved ${new Date(item.created_at).toLocaleString()}` : item.sync_error}</Text>
        {!savedCopies && item.sync_state === 'pending_delete' && <Text>Pending deletion</Text>}
      </TouchableOpacity>} />
  </View>;
}
