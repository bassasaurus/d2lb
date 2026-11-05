import React, { useEffect, useState } from 'react';
import { Alert, Button, ScrollView, Text, TouchableOpacity, View } from 'react-native';
import { aircraftScope } from '../storage/aircraft';
import { flightScope, flightStore } from '../storage/flights';
import { CATEGORY_CHOICES, CLASS_CHOICES, ENGINE_CHOICES, FLAGS, WEIGHT_CHOICES } from './fields.mjs';
import { STYLES } from '../styles/styles';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import RecordActions from '../components/RecordActions';
import Separator from '../components/Separator';

export default function AircraftDetailScreen({ route, navigation }) {
  const [item, setItem] = useState(route.params.item);
  const [tailnumbers, setTailnumbers] = useState([]);
  useEffect(() => {
    setItem(route.params.item);
    let active = true;
    const refresh = async () => {
      try {
        const records = await (await flightStore()).list(aircraftScope(await flightScope()));
        const current = records.find(row => row.local_id === route.params.item.local_id || row.aircraft_type === route.params.item.aircraft_type);
        const tails = await (await flightStore()).reference(await flightScope(), 'tailnumbers');
        if (active) {
          if (current) setItem(current);
          setTailnumbers(tails.filter(tail => tail.aircraft === route.params.item.aircraft_type));
        }
      } catch (error) { /* Preserve the last saved detail while unavailable. */ }
    };
    refresh();
    const timer = setInterval(refresh, 3000);
    return () => { active = false; clearInterval(timer); };
  }, [route.params.item]);
  const remove = async () => {
    try {
      const scope = await flightScope();
      const store = await flightStore();
      const flights = await store.list(scope);
      const tails = await store.reference(scope, 'tailnumbers');
      if (flights.some(flight => flight.aircraft_type === item.aircraft_type) || tails.some(tail => tail.aircraft === item.aircraft_type)) {
        Alert.alert('Aircraft is in use', 'Aircraft referenced by flights or tailnumbers cannot be deleted.');
        return;
      }
      await store.remove(aircraftScope(scope), item.local_id);
      navigation.navigate('AircraftList');
    } catch (error) { Alert.alert('Aircraft not deleted', 'Your record is still saved. Please try again.'); }
  };
  return <ScrollView contentContainerStyle={{ padding: 16 }}>
    <Text style={{ fontSize: 24, fontWeight: '600', marginBottom: 16 }}>{item.aircraft_type}</Text>
    <Text>Category: {CATEGORY_CHOICES.find(([key]) => key === item.aircraft_category)?.[1] || 'Not set'}</Text>
    <Text style={{ marginVertical: 8 }}>Class: {CLASS_CHOICES.find(([key]) => key === item.aircraft_class)?.[1] || 'Not set'}</Text>
    {[...ENGINE_CHOICES, ...WEIGHT_CHOICES, ...FLAGS].filter(([key]) => item[key]).map(([key, label]) => <Text key={key} style={{ marginVertical: 6 }}>{label}</Text>)}
    {item.sync_state !== 'synced' && <Text style={{ color: STYLES.danger, marginVertical: 16 }}>{item.sync_error || 'Saved on this device — pending upload'}</Text>}
    {tailnumbers.length > 0 && <View style={{ marginTop: 20 }}>
      <Text style={{ fontWeight: '600', marginBottom: 8 }}>Tailnumbers</Text>
      {tailnumbers.map(tail => <TouchableOpacity key={tail.id} accessibilityRole="button" accessibilityLabel={`Edit ${tail.registration}`}
        onPress={() => navigation.navigate('TailnumberUpdate', { item: tail })}
        style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 12, borderBottomWidth: 1, borderColor: '#ddd' }}>
        <Text style={{ color: STYLES.blue }}>{tail.registration}</Text>
        <MaterialCommunityIcons name="pencil" size={24} color={STYLES.blue} />
      </TouchableOpacity>)}
    </View>}
    <TouchableOpacity accessibilityRole="button" style={{ alignSelf: 'stretch', backgroundColor: STYLES.green, alignItems: 'center', paddingVertical: 12, marginVertical: 12 }}
      onPress={() => navigation.navigate('AircraftTailnumberCreate', { aircraft_type: item.aircraft_type, fromAircraft: true })}>
      <Text style={{ color: STYLES.white }}>New Tailnumber</Text>
    </TouchableOpacity>
    <Separator />
    <RecordActions recordName="aircraft"
      onUpdate={() => navigation.navigate('AircraftForm', { item })}
      onDelete={() => Alert.alert('Delete aircraft?', 'Aircraft in use cannot be deleted. Otherwise this deletion will sync when connected.', [
        { text: 'Cancel', style: 'cancel' }, { text: 'Delete', style: 'destructive', onPress: remove },
      ])}
    />
  </ScrollView>;
}
