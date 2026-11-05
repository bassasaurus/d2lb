import React, { useCallback, useState } from 'react';
import { ScrollView } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import Text from '../components/AppText';
import RecordActions from '../components/RecordActions';
import Separator from '../components/Separator';
import { flightScope, flightStore } from '../storage/flights';

export default function TailnumberDetailScreen({ route, navigation }) {
  const [item, setItem] = useState(route.params.item);
  useFocusEffect(useCallback(() => {
    let active = true;
    setItem(route.params.item);
    (async () => {
      const store = await flightStore();
      const rows = await store.reference(await flightScope(), 'tailnumbers');
      const current = rows.find(row => row.id === route.params.item.id);
      if (active && current) setItem(current);
    })().catch(() => {});
    return () => { active = false; };
  }, [route.params.item]));
  return <ScrollView contentContainerStyle={{ padding: 16 }}>
    <Text style={{ fontSize: 24, fontWeight: '600', marginBottom: 16 }}>{item.registration}</Text>
    <Text style={{ marginBottom: 12 }}>Aircraft: {item.aircraft}</Text>
    <Text style={{ marginBottom: 16 }}>Operating rules: {[[item.is_91, 'Part 91'], [item.is_135, 'Part 135'], [item.is_121, 'Part 121']]
      .filter(([enabled]) => enabled).map(([, label]) => label).join(', ') || 'Not set'}</Text>
    <Separator />
    <RecordActions recordName="tailnumber"
      onUpdate={() => navigation.navigate('TailnumberUpdate', { item })} />
  </ScrollView>;
}
