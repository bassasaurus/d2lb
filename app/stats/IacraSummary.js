import React, {useState} from 'react';
import {Pressable, View} from 'react-native';
import {MaterialCommunityIcons} from '@expo/vector-icons';
import Card from '../components/Card';
import Text from '../components/AppText';
import {useAppTheme} from '../theme/ThemeProvider';
import {metricValue} from './summary.mjs';

function Figure({label, value, count = false, testID}) {
  const {colors} = useAppTheme();
  return <View style={{flexDirection: 'row', justifyContent: 'space-between', gap: 16, paddingVertical: 5}}>
    <Text style={{flex: 1, color: colors.muted}}>{label}</Text>
    <Text testID={testID} style={{fontVariant: ['tabular-nums']}}>{metricValue(count ? 'count' : 'hours', value)}</Text>
  </View>;
}
export function LaunchCounts({row}) {
  return <View style={{marginTop: 8}}>
    <Figure label="Flights" value={row.flights} testID={`launch-${row.code}-flights`} count />
    <Figure label="PIC flights" value={row.pic} testID={`launch-${row.code}-pic`} count />
    <Figure label="Dual flights" value={row.dual} testID={`launch-${row.code}-dual`} count />
    {row.code === 'GL' && <>
      <Figure label="Aerotow launches" value={row.aerotow} testID={`launch-${row.code}-aerotow`} count />
      <Figure label="Ground launches" value={row.ground} testID={`launch-${row.code}-ground`} count />
      <Figure label="Self-launches" value={row.self_launch} testID={`launch-${row.code}-self_launch`} count />
    </>}
  </View>;
}
function Category({row, launches}) {
  const [expanded, setExpanded] = useState(false);
  const {colors} = useAppTheme();
  return <View style={{marginTop: 8}}>
    <Pressable testID={`iacra-category-${row.code}`} accessibilityRole="button" accessibilityState={{expanded}}
      accessibilityLabel={`${row.label}, ${metricValue('hours', row.cells[0].value)}`}
      onPress={() => setExpanded(value => !value)}
      style={{minHeight: 48, flexDirection: 'row', alignItems: 'center', gap: 12}}>
      <Text weight="600" style={{flex: 1}}>{row.label}</Text>
      <MaterialCommunityIcons name={expanded ? 'chevron-up' : 'chevron-down'} color={colors.muted} size={22} />
      <Text weight="600">{metricValue('hours', row.cells[0].value)}</Text>
    </Pressable>
    {expanded && <View>
      {row.cells.slice(1).map((cell, index) => !cell.shaded && <Figure key={cell.label} {...cell} testID={`iacra-${row.code}-cell-${index + 1}`} />)}
      {launches && <LaunchCounts row={launches} />}
    </View>}
  </View>;
}
export default function IacraSummary({report}) {
  const [expanded, setExpanded] = useState(false);
  const {colors} = useAppTheme();
  return <Card style={{marginTop: 12, marginBottom: 8}}>
    <Pressable testID="iacra-toggle" accessibilityRole="button" accessibilityState={{expanded}} accessibilityLabel="IACRA Record of Pilot Time"
      onPress={() => setExpanded(value => !value)}
      style={{minHeight: 48, flexDirection: 'row', alignItems: 'center', gap: 12}}>
      <Text weight="600" style={{flex: 1}}>IACRA — Record of Pilot Time</Text>
      <MaterialCommunityIcons name={expanded ? 'chevron-up' : 'chevron-down'} color={colors.muted} size={22} />
    </Pressable>
    {expanded && <View>
      <Text style={{color: colors.muted}}>FAA Form 8710-1, Section III. Aircraft and training device time are separate.</Text>
      {report.rows.map(row => <Category key={row.code} row={row} launches={report.launches.find(item => item.code === row.code)} />)}
      {report.classes.length > 0 && <Text weight="600" style={{marginTop: 12}}>Category and Class Totals</Text>}
      {report.classes.map(row => <View key={row.code} style={{marginTop: 10}}>
        <Text weight="600">{row.label}</Text>
        <Figure label="Total" value={row.total} />
        <Figure label="PIC" value={row.pic} />
        <Figure label="SIC" value={row.sic} />
        <Figure label="Instruction received" value={row.instruction} />
      </View>)}
      {report.devices.length > 0 && <Text weight="600" style={{marginTop: 12}}>Device Class Totals</Text>}
      {report.devices.map(row => <View key={row.type} style={{marginTop: 10}}>
        <Text weight="600">{row.type}</Text>
        <Figure label="Single-engine" value={row.se} />
        <Figure label="Multi-engine" value={row.me} />
        <Figure label="Helicopter" value={row.helicopter} />
      </View>)}
      {!report.rows.length && <Text style={{marginTop: 8}}>No aircraft or training devices recorded yet.</Text>}
      <Text style={{color: colors.muted, marginTop: 12}}>{report.note}</Text>
    </View>}
  </Card>;
}
