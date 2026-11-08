import React, { useCallback, useRef, useState } from 'react';
import { Pressable, RefreshControl } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { FlatList } from '../components/OverflowLists';
import Card from '../components/Card';
import Text from '../components/AppText';
import { flightScope, flightStore } from '../storage/flights';
import { reviewableRecords } from './reviewAccess';
import { recordTitle } from './comparison.mjs';
import { useAppTheme } from '../theme/ThemeProvider';

export default function SyncReviewListScreen({ navigation }) {
  const { colors } = useAppTheme();
  const [rows, setRows] = useState([]);
  const [status, setStatus] = useState('Loading sync issues…');
  const [refreshing, setRefreshing] = useState(false);
  const refresh = useRef();
  useFocusEffect(useCallback(() => {
    let active = true;
    const load = async () => {
      try {
        const pending = await reviewableRecords(await flightStore(), await flightScope());
        if (!active) return;
        setRows(pending);
        if (pending.length) setStatus('Choose a record to review.');
        else navigation.getParent()?.goBack();
      } catch {
        if (active) setStatus('Unable to load sync issues. Pull down to try again.');
      } finally {
        if (active) setRefreshing(false);
      }
    };
    refresh.current = load;
    load();
    return () => { active = false; refresh.current = null; };
  }, [navigation]));

  return <FlatList style={{ flex: 1, backgroundColor: colors.background }}
    contentContainerStyle={{ padding: 12 }}
    ListHeaderComponent={<Text accessibilityLiveRegion="polite" style={{ marginBottom: 8 }}>{status}</Text>}
    data={rows} keyExtractor={item => `${item.kind}:${item.local_id}`}
    refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); refresh.current?.(); }} />}
    renderItem={({ item }) => <Pressable accessibilityRole="button" style={{ marginTop: 6 }}
      onPress={() => navigation.navigate('SyncConflict', { kind: item.kind, localId: item.local_id })}>
      <Card compact style={{ minHeight: 48 }}>
        <Text color={colors.primary} size={16} weight="600">{recordTitle(item.kind, item)}</Text>
        <Text>{item.sync_error}</Text>
        {item.sync_state === 'pending_delete' && <Text>Pending deletion</Text>}
      </Card>
    </Pressable>} />;
}
