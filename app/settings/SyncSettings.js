import React, { useCallback, useState } from 'react';
import { Pressable, View } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import NetInfo from '@react-native-community/netinfo';
import { internetAvailable, subscribeAutoSync } from '../api/autoSync.mjs';
import { logbookPendingCount } from '../api/logbookRefresh.mjs';
import syncFlightData, { LAST_SUCCESSFUL_SYNC } from '../api/syncFlightData';
import Text from '../components/AppText';
import Card from '../components/Card';
import { reviewRecord } from '../components/RecordIssue';
import { reviewableRecords } from '../sync/reviewAccess';
import PlatformActionButton from '../components/PlatformActionButton';
import { aircraftScope } from '../storage/aircraft';
import { flightScope, flightStore } from '../storage/flights';
import { tailnumberScope } from '../storage/tailnumberRecords.mjs';
import { useAppTheme } from '../theme/ThemeProvider';

export default function SyncSettings({ navigation }) {
  const { colors } = useAppTheme();
  const [status, setStatus] = useState(null);
  const [statusError, setStatusError] = useState(false);
  const [retrying, setRetrying] = useState(false);
  const [retryMessage, setRetryMessage] = useState('');
  const [refreshKey, setRefreshKey] = useState(0);

  useFocusEffect(useCallback(() => {
    let active = true;
    let latestRead = 0;
    async function load() {
      const read = ++latestRead;
      try {
        const scope = await flightScope();
        const store = await flightStore();
        const [pending, [lastSync], issues] = await Promise.all([
          logbookPendingCount(store, [scope, aircraftScope(scope), tailnumberScope(scope)]),
          store.reference(scope, LAST_SUCCESSFUL_SYNC),
          reviewableRecords(store, scope),
        ]);
        if (active && read === latestRead) {
          setStatus({ pending, lastSync: lastSync?.completed_at, issues });
          setStatusError(false);
          if (pending === 0) setRetryMessage('');
        }
      } catch {
        if (active && read === latestRead) setStatusError(true);
      }
    }
    load();
    const unsubscribe = subscribeAutoSync(event => {
      if (event === 'completed' || event === 'failed') load();
    });
    return () => { active = false; unsubscribe(); };
  }, [refreshKey]));

  async function retrySync() {
    setRetrying(true);
    setRetryMessage('');
    try {
      if (!internetAvailable(await NetInfo.refresh())) {
        setRetryMessage('You’re offline. Reconnect to sync your changes.');
        return;
      }
      await syncFlightData({ retry: true });
    } catch {
      setRetryMessage('Sync couldn’t finish. Your changes are saved on this device.');
    } finally {
      setRetrying(false);
      setRefreshKey(key => key + 1);
    }
  }

  const lastSync = status?.lastSync ? new Date(status.lastSync).toLocaleString() : 'Not recorded';
  const issues = statusError ? [] : status?.issues || [];
  const reviewLabel = issues.length === 1 ? 'Review sync issue' : `Review ${issues.length} sync issues`;
  const syncStatus = statusError ? <Text color={colors.danger}>Couldn’t read sync status.</Text> : status ? <>
    <Text>Last successful sync:</Text>
    <Text color={colors.muted} style={{ marginBottom: 8 }}>{lastSync}</Text>
    <Text accessibilityLiveRegion="polite">Pending changes: {status.pending}</Text>
  </> : <Text color={colors.muted}>Loading sync status…</Text>;

  function openReview() {
    if (issues.length === 1) reviewRecord(navigation, issues[0].kind, issues[0]);
    else navigation.navigate('SyncReview', { screen: 'SyncReviewList' });
  }

  return <View style={{ marginTop: 12 }}>
    <Text accessibilityRole="header" size={18} weight="600" style={{ marginBottom: 12 }}>Sync &amp; Offline</Text>
    <Card compact>
      {issues.length ? <Pressable accessibilityRole="button" onPress={openReview}
        accessibilityLabel={reviewLabel}>
        {syncStatus}
        <Text color={colors.danger} weight="600" style={{ marginTop: 8 }}>
          {reviewLabel}
        </Text>
      </Pressable> : syncStatus}
      {!statusError && status?.pending > 0 && <PlatformActionButton title={retrying ? 'Syncing…' : 'Retry Sync'}
        variant="text" onPress={retrySync} disabled={retrying} />}
      {retryMessage ? <Text color={colors.danger} accessibilityLiveRegion="polite">{retryMessage}</Text> : null}
    </Card>
  </View>;
}
