import RecordSyncIndicator from '../components/RecordSyncIndicator';
import { subscribeAutoSync } from '../api/autoSync.mjs';
import { flightScope } from '../storage/flights';
import RecordIssue from '../components/RecordIssue';
import { ScrollView } from '../components/OverflowLists';
import { listTailnumbers, tailnumberScope } from '../storage/tailnumbers';
import React, { useCallback, useState } from 'react';

import { useFocusEffect } from '@react-navigation/native';
import Card from '../components/Card';
import { useAppTheme } from '../theme/ThemeProvider';
import Text from '../components/AppText';
import RecordActions from '../components/RecordActions';
import Separator from '../components/Separator';

export default function TailnumberDetailScreen({ route, navigation }) {
  const { colors } = useAppTheme();
  const [item, setItem] = useState(route.params.item);
  const [scope, setScope] = useState(null);
  useFocusEffect(useCallback(() => {
    let active = true;
    setItem(route.params.item);
    const load = async () => {
      const account = await flightScope();
      const rows = await listTailnumbers(account);
      const current = rows.find(row => (route.params.item.id ? row.id === route.params.item.id : row.local_id === route.params.item.local_id || row.registration === route.params.item.registration));
      if (current && await flightScope() === account && active) {
        setScope(account);
        setItem(current);
      }
    };
    load().catch(() => {});
    const timer = setInterval(() => load().catch(() => {}), 3000);
    const unsubscribe = subscribeAutoSync(event => {
      if (event === 'completed' || event === 'failed') load().catch(() => {});
    });
    return () => { active = false; unsubscribe(); clearInterval(timer); };
  }, [route.params.item]));
  return <ScrollView style={{ backgroundColor: colors.background }} contentContainerStyle={{ padding: 12 }}>
    <Card>
    <Text style={{ fontSize: 24, fontWeight: '600', marginBottom: 16 }}>{item.registration}</Text>
    <Text style={{ marginBottom: 12 }}>Aircraft: {item.aircraft}</Text>
    <Text style={{ marginBottom: 16 }}>Operating rules: {[[item.is_91, 'Part 91'], [item.is_135, 'Part 135'], [item.is_121, 'Part 121']]
      .filter(([enabled]) => enabled).map(([, label]) => label).join(', ') || 'Not set'}</Text>
    <RecordIssue item={item} kind="tailnumber" navigation={navigation} />
    <RecordSyncIndicator item={item} scope={scope ? tailnumberScope(scope) : undefined} />
    <Separator />
    <Text size={14} color={colors.muted}>Use Update to correct this tailnumber and keep its linked flights.</Text>
    <RecordActions recordName="tailnumber"
      onUpdate={() => navigation.navigate('TailnumberUpdate', { item })} />
    </Card>
  </ScrollView>;
}
