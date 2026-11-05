import { ScrollView } from '../components/OverflowLists';
import { listTailnumbers } from '../storage/tailnumbers';
import React, { useCallback, useState } from 'react';

import { useFocusEffect } from '@react-navigation/native';
import Text from '../components/AppText';
import RecordActions from '../components/RecordActions';
import Separator from '../components/Separator';

export default function TailnumberDetailScreen({ route, navigation }) {
  const [item, setItem] = useState(route.params.item);
  useFocusEffect(useCallback(() => {
    let active = true;
    setItem(route.params.item);
    const load = async () => {
      const rows = await listTailnumbers();
      const current = rows.find(row => (route.params.item.id ? row.id === route.params.item.id : row.local_id === route.params.item.local_id || row.registration === route.params.item.registration));
      if (active && current) setItem(current);
    };
    load().catch(() => {});
    const timer = setInterval(() => load().catch(() => {}), 3000);
    return () => { active = false; clearInterval(timer); };
  }, [route.params.item]));
  return <ScrollView contentContainerStyle={{ padding: 16 }}>
    <Text style={{ fontSize: 24, fontWeight: '600', marginBottom: 16 }}>{item.registration}</Text>
    <Text style={{ marginBottom: 12 }}>Aircraft: {item.aircraft}</Text>
    <Text style={{ marginBottom: 16 }}>Operating rules: {[[item.is_91, 'Part 91'], [item.is_135, 'Part 135'], [item.is_121, 'Part 121']]
      .filter(([enabled]) => enabled).map(([, label]) => label).join(', ') || 'Not set'}</Text>
    {item.sync_state && item.sync_state !== 'synced' && <Text style={{ marginBottom: 12 }}>{item.sync_error || 'Saved on this device — pending upload'}</Text>}
    <Separator />
    <RecordActions recordName="tailnumber"
      onUpdate={() => navigation.navigate('TailnumberUpdate', { item })} />
  </ScrollView>;
}
