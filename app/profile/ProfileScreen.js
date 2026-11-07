import React, { useCallback, useState } from 'react';
import { Image, Linking, RefreshControl, View } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ScrollView } from '../components/OverflowLists';
import Card from '../components/Card';
import Text from '../components/AppText';
import PlatformActionButton from '../components/PlatformActionButton';
import { useAppTheme } from '../theme/ThemeProvider';
import api from '../api/axiosConfig';
import { flightScope, flightStore, tokenPartition } from '../storage/flights';

export function profileDate(value) {
  if (!value) return 'Not recorded';
  const [year, month, day] = value.slice(0, 10).split('-');
  return `${month}/${day}/${year}`;
}
function Detail({ label, value }) {
  const { colors } = useAppTheme();
  return <View style={{ flexDirection: 'row', gap: 16, paddingVertical: 5 }}>
    <Text color={colors.muted} style={{ flexShrink: 1 }}>{label}</Text>
    <Text style={{ flex: 1, textAlign: 'right' }} selectable>{value || 'Not recorded'}</Text>
  </View>;
}
export default function ProfileScreen({ navigation }) {
  const { colors } = useAppTheme();
  const [profile, setProfile] = useState(null);
  const [refreshing, setRefreshing] = useState(false);
  const [message, setMessage] = useState('');
  const [refreshKey, setRefreshKey] = useState(0);
  useFocusEffect(useCallback(() => {
    let active = true;
    const controller = new AbortController();
    (async () => {
      setRefreshing(true);
      try {
        const partition = await tokenPartition();
        const current = async () => active && await tokenPartition() === partition;
        const scope = await flightScope();
        const store = await flightStore();
        const cached = (await store.reference(scope, 'profile'))[0];
        if (await current()) setProfile(cached || null);
        const { data } = await api.get('/api/mobile/profile/', { signal: controller.signal });
        if (!await current()) return;
        await store.cacheReference(scope, 'profile', [data]);
        if (await current()) { setProfile(data); setMessage(''); }
      } catch (error) {
        if (active) setMessage(error.response?.status === 404
          ? 'Profile needs the matching Django API update.'
          : 'Could not refresh profile. Saved information may be out of date. Pull down to retry.');
      } finally { if (active) setRefreshing(false); }
    })();
    return () => { active = false; controller.abort(); };
  }, [refreshKey]));
  const account = profile?.account;
  const medical = profile?.medical;
  const subscription = profile?.subscription;
  return <SafeAreaView edges={['left', 'right', 'bottom']} style={{ flex: 1, backgroundColor: colors.background }}>
    <ScrollView contentContainerStyle={{ padding: 12 }} refreshControl={<RefreshControl refreshing={refreshing}
      onRefresh={() => setRefreshKey(value => value + 1)} />}>
      {profile && <Text color={colors.muted} style={{ textAlign: 'center', marginBottom: 12 }}>Downloaded {new Date(profile.downloaded_at).toLocaleString()}</Text>}
      {message ? <Text color={colors.danger} style={{ textAlign: 'center', marginBottom: 12 }} accessibilityLiveRegion="polite">{message}</Text> : null}
      {profile && <>
        <Card compact style={{ marginBottom: 8 }}>
          <Text size={18} weight="600">Account</Text>
          <Detail label="Name" value={[account.first_name, account.last_name].filter(Boolean).join(' ') || account.username} />
          <Detail label="Email" value={account.email} />
          <Detail label="Company" value={account.company} />
          <Detail label="Joined" value={profileDate(account.joined)} />
          <PlatformActionButton title="Update Account" variant="text" onPress={() => navigation.navigate('ProfileEdit', { section: 'account', values: {
            first_name: account.first_name, last_name: account.last_name, company: account.company } })} />
        </Card>
        <Card compact style={{ marginBottom: 8 }}>
          <Text size={18} weight="600">Subscription</Text>
          <Detail label="Status" value={subscription.status} />
          {subscription.plan && <Detail label="Plan" value={subscription.plan} />}
          {subscription.end_date && <Detail label={['Free trial', 'Expiring soon'].includes(subscription.status) ? 'Trial ends' : subscription.status === 'Active' ? 'Next billing date' : 'Access ends'} value={profileDate(subscription.end_date)} />}
        </Card>
        <Card compact style={{ marginBottom: 8 }}>
          <Text size={18} weight="600">Medical Certificate</Text>
          <Detail label="Issued" value={profileDate(medical.medical_issue_date)} />
          <Detail label="Class" value={medical.first_class ? 'First Class' : medical.second_class ? 'Second Class' : medical.third_class ? 'Third Class' : 'Not recorded'} />
          <Detail label="Over 40" value={medical.over_40 ? 'Yes' : 'No'} />
          <Detail label="Due Date" value={profileDate(profile.medical_due_date)} />
          <PlatformActionButton title="Update Medical" variant="text" onPress={() => navigation.navigate('ProfileEdit', { section: 'medical', values: medical })} />
        </Card>
        <Card compact style={{ marginBottom: 8 }}>
          <Text size={18} weight="600">Signature</Text>
          {profile.signature?.startsWith('data:image/png;base64,') ? <View style={{ backgroundColor: '#fff', borderRadius: 6, marginTop: 12 }}>
            <Image accessibilityLabel="Your signature" source={{ uri: profile.signature }} resizeMode="contain" style={{ height: 120, width: '100%' }} />
          </View> : <Text color={colors.muted} style={{ marginTop: 8 }}>{profile.signature ? 'Signature saved.' : 'No signature saved.'}</Text>}
          <PlatformActionButton title="Update Signature" variant="text"
            onPress={() => navigation.navigate('SignatureEdit', { revision: profile.signature_revision, signature: profile.signature })} />
        </Card>
      </>}
      <PlatformActionButton title="Contact support" variant="text" onPress={() => Linking.openURL('mailto:support@direct2logbook.com').catch(() => setMessage('Email support@direct2logbook.com for help.'))} />
    </ScrollView>
  </SafeAreaView>;
}
