import * as Sentry from '@sentry/react-native';
import { formatDateTime } from '../formatting/dates.mjs';
import React from 'react';
import useProfile from './useProfile';
import { profileDate } from './profileDate.mjs';
import { Image, RefreshControl, View } from 'react-native';
import Svg, { Defs, Filter, FeColorMatrix, Image as SvgImage } from 'react-native-svg';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ScrollView } from '../components/OverflowLists';
import Card from '../components/Card';
import Text from '../components/AppText';
import PlatformActionButton from '../components/PlatformActionButton';
import { useAppTheme } from '../theme/ThemeProvider';
import { openContactEmail } from '../settings/contactEmail';

function Detail({ label, value }) {
  const { colors } = useAppTheme();
  return <View style={{ flexDirection: 'row', gap: 16, paddingVertical: 5 }}>
    <Text color={colors.muted} style={{ flexShrink: 1 }}>{label}</Text>
    <Text style={{ flex: 1, textAlign: 'right' }} selectable>{value || 'Not recorded'}</Text>
  </View>;
}
export default function ProfileScreen({ navigation }) {
  const { colors, isDark } = useAppTheme();
  const { profile, refreshing, message, refresh } = useProfile();
  const account = profile?.account;
  const subscription = profile?.subscription;
  const freeAccess = subscription?.status === 'Free access';
  return <SafeAreaView edges={['left', 'right', 'bottom']} style={{ flex: 1, backgroundColor: colors.background }}>
    <ScrollView contentContainerStyle={{ padding: 12 }} refreshControl={<RefreshControl refreshing={refreshing}
      onRefresh={refresh} />}>
      {profile && <Text color={colors.muted} style={{ textAlign: 'center', marginBottom: 12 }}>Downloaded {formatDateTime(profile.downloaded_at)}</Text>}
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
          {freeAccess && <Detail label="Access ends" value="Never" />}
          {!freeAccess && subscription.end_date && <Detail label={['Free trial', 'Expiring soon'].includes(subscription.status) ? 'Trial ends' : subscription.status === 'Active' ? 'Next billing date' : 'Access ends'} value={profileDate(subscription.end_date)} />}
        </Card>
        <Card compact style={{ marginBottom: 8 }}>
          <Text size={18} weight="600">Signature</Text>
          {profile.signature?.startsWith('data:image/png;base64,') ? <Sentry.Mask style={{ backgroundColor: isDark ? '#000' : '#fff', borderRadius: 6, marginTop: 12 }}>
            {isDark ? <Svg accessibilityLabel="Your signature" height={120} width="100%" viewBox="0 0 900 300">
              <Defs>
                <Filter id="signature-dark">
                  <FeColorMatrix type="matrix" values="-1 0 0 0 1  0 -1 0 0 1  0 0 -1 0 1  0 0 0 1 0" />
                </Filter>
              </Defs>
              <SvgImage href={{ uri: profile.signature }} width={900} height={300}
                preserveAspectRatio="xMidYMid meet" filter="url(#signature-dark)" />
            </Svg> : <Image accessibilityLabel="Your signature" source={{ uri: profile.signature }}
              resizeMode="contain" style={{ height: 120, width: '100%' }} />}
          </Sentry.Mask> : <Text color={colors.muted} style={{ marginTop: 8 }}>{profile.signature ? 'Signature saved.' : 'No signature saved.'}</Text>}
          <PlatformActionButton title="Update Signature" variant="text"
            onPress={() => navigation.navigate('SignatureEdit', { revision: profile.signature_revision, signature: profile.signature })} />
        </Card>
      </>}
      <PlatformActionButton title="Contact Support" variant="text" onPress={() => openContactEmail()} />
    </ScrollView>
  </SafeAreaView>;
}
