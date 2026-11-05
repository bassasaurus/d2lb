import { ScrollView } from '../components/OverflowLists';
import { listTailnumbers } from '../storage/tailnumbers';
import React, { useEffect, useState } from 'react';
import { Alert, Button, TouchableOpacity, View, useWindowDimensions } from 'react-native';
import Text from '../components/AppText';
import { aircraftScope } from '../storage/aircraft';
import { flightScope, flightStore } from '../storage/flights';
import { CATEGORY_CHOICES, CLASS_CHOICES, ENGINE_CHOICES, FLAGS, WEIGHT_CHOICES } from './fields.mjs';
import { useAppTheme } from '../theme/ThemeProvider';
import RecordActions from '../components/RecordActions';
import Separator from '../components/Separator';

export default function AircraftDetailScreen({ route, navigation }) {
  const { styles: STYLES } = useAppTheme();
  const { width } = useWindowDimensions();
  const columns = Math.max(2, Math.min(4, Math.floor((width - 32) / 105)));
  const [item, setItem] = useState(route.params.item);
  const [tailnumbers, setTailnumbers] = useState([]);
  useEffect(() => {
    setItem(route.params.item);
    let active = true;
    const refresh = async () => {
      try {
        const records = await (await flightStore()).list(aircraftScope(await flightScope()));
        const current = records.find(row => row.local_id === route.params.item.local_id || row.aircraft_type === route.params.item.aircraft_type);
        const tails = await listTailnumbers();
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
      const tails = await listTailnumbers(scope);
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
    <View style={{ marginTop: 16 }}>
    <RecordActions recordName="aircraft"
      onUpdate={() => navigation.navigate('AircraftForm', { item })}
      onDelete={() => Alert.alert('Delete aircraft?', 'Aircraft in use cannot be deleted. Otherwise this deletion will sync when connected.', [
        { text: 'Cancel', style: 'cancel' }, { text: 'Delete', style: 'destructive', onPress: remove },
      ])}
    />
    </View>
    <View style={{ marginTop: 24 }}>
      <Separator />
      <Text style={{ fontWeight: '600', fontSize: 18, marginTop: 12 }}>Tailnumbers ({tailnumbers.length})</Text>
    <TouchableOpacity accessibilityRole="button" style={{ alignSelf: 'stretch', backgroundColor: STYLES.green, alignItems: 'center', paddingVertical: 12, marginVertical: 12 }}
      onPress={() => navigation.navigate('AircraftTailnumberCreate', { aircraft_type: item.aircraft_type, fromAircraft: true })}>
      <Text style={{ color: STYLES.onAction }}>New Tailnumber</Text>
    </TouchableOpacity>
    {tailnumbers.length > 0 && <View>
      <ScrollView nestedScrollEnabled persistentScrollbar style={{ maxHeight: 264 }}
        contentContainerStyle={{ flexDirection: 'row', flexWrap: 'wrap' }}>
        {[...tailnumbers].sort((a, b) => a.registration.localeCompare(b.registration, 'en', { numeric: true, sensitivity: 'base' })).map(tail =>
          <TouchableOpacity key={tail.local_id || tail.id} accessibilityRole="button" accessibilityLabel={`View ${tail.registration}`}
            onPress={() => navigation.navigate('TailnumberDetail', { item: tail })}
            style={{ width: `${100 / columns}%`, minHeight: 48, justifyContent: 'center', paddingHorizontal: 8, borderBottomWidth: 1, borderColor: STYLES.grey }}>
            <Text numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.85} style={{ color: STYLES.blue }}>{tail.registration}</Text>
          </TouchableOpacity>)}
      </ScrollView>
    </View>}
    </View>
  </ScrollView>;
}
