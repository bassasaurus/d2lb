import { flightCrewLabel } from '../forms/flightRoles.mjs';
import { connectionNotice, syncConnectionFailure } from '../api/connectionNotice.mjs';
import ReminderFeedback from '../components/ReminderFeedback';
import { localDraftStore } from '../drafts/localDraftStore';
import { draftKey, flightDraftRow } from '../drafts/draftStore.mjs';
import { reviewRecord } from '../components/RecordIssue';
import { canAttemptApiSync, subscribeAutoSync } from '../api/autoSync.mjs';
import api from '../api/axiosConfig';
import { completedFlightSyncs, recordSyncFeedback } from '../api/flightSyncFeedback.mjs';
import { FlatList } from '../components/OverflowLists';
import { tailnumberScope } from '../storage/tailnumberRecords.mjs';
import { shouldRefreshLogbook, logbookPendingCount } from '../api/logbookRefresh.mjs';
import { useMemo } from 'react';
import React, { useState, useEffect} from "react";
import { AccessibilityInfo, Animated, StyleSheet, TouchableOpacity, RefreshControl } from 'react-native';
import { SafeAreaView } from "react-native-safe-area-context";
import { useFocusEffect, useIsFocused } from "@react-navigation/native";
import { useCardAnimation } from "@react-navigation/stack";
import { useAppTheme } from '../theme/ThemeProvider';
import syncFlightData from "../api/syncFlightData";
import LogbookReminders from '../components/LogbookReminders';
import FlightItem from "../components/FlightItem";
import BottomCreateButton from "../components/BottomCreateButton";
import AppContext from "../components/AppContext";
import { Text, AppState } from "react-native";
import NetInfo from "@react-native-community/netinfo";
import * as Network from 'expo-network';
import { Platform } from 'react-native';
import fetchTailnumbers from "../api/fetchTailnumbers";
import { flightStore, flightScope, tokenPartition, refreshFlightCache } from "../storage/flights";
import { aircraftScope } from "../storage/aircraft";
import AsyncStorage from "@react-native-async-storage/async-storage";

const LOGBOOK_INSET = 12;

const FlightListScreen = ({ navigation, route }) => {
  const { styles: STYLES } = useAppTheme();
  const styles = useMemo(() => createStyles(STYLES), [STYLES]);

  // removeAsyncData('offlineFlights')

  const [reminderFeedback, setReminderFeedback] = useState(null);
  const [manualRefreshing, setManualRefreshing] = useState(false);
  const manualRefreshRunning = React.useRef(false);
  const mounted = React.useRef(true);
  useEffect(() => { mounted.current = true; return () => { mounted.current = false; }; }, []);
  const [reminderRefresh, setReminderRefresh] = useState(0);
  const [data, setData] = useState([]);
  const deletedFlightId = route.params?.deletedFlightId;
  const isFocused = useIsFocused();
  const { next } = useCardAnimation();
  const removalProgress = React.useRef(new Animated.Value(1)).current;

  useEffect(() => {
    // Wait until the detail card has finished closing so the exit is visible.
    if (!deletedFlightId || !isFocused || next) return;
    let active = true;
    let animation;
    removalProgress.setValue(1);
    const finish = () => {
      if (!active) return;
      setData(rows => rows.filter(row => row.local_id !== deletedFlightId));
      navigation.setParams({ deletedFlightId: undefined });
    };
    const start = reduceMotion => {
      if (!active) return;
      if (reduceMotion) {
        finish();
        return;
      }
      animation = Animated.timing(removalProgress, {
        toValue: 0, duration: 600, useNativeDriver: false,
      });
      animation.start(({ finished }) => { if (finished) finish(); });
    };
    AccessibilityInfo.isReduceMotionEnabled().then(start, () => start(false));
    return () => {
      active = false;
      animation?.stop();
    };
  }, [deletedFlightId, isFocused, navigation, next, removalProgress]);
  const [syncEvents, setSyncEvents] = useState({});
  const [recordScope, setRecordScope] = useState(null);
  const feedbackPartition = React.useRef(null);
  const [windowNotice, setWindowNotice] = useState(false);
  const [noticeMessage, setNoticeMessage] = useState("");
  const [noticeError, setNoticeError] = useState("");
  const [noticeHeight, setNoticeHeight] = useState(38);
  const noticeProgress = React.useRef(new Animated.Value(0)).current;
  useEffect(() => {
    const animation = Animated.timing(noticeProgress, {
      toValue: windowNotice ? 1 : 0, duration: 250, useNativeDriver: false,
    });
    animation.start();
    return () => animation.stop();
  }, [windowNotice, noticeProgress]);
  const noticeTimer = React.useRef(null);
  const [status, setStatus] = useState("");

  useFocusEffect(React.useCallback(() => {
    // Keep the previous rows mounted until the local deletion finishes animating.
    if (deletedFlightId) return;
    let active = true;
    let running = false;
    let noticeSequence = 0;
    function showConnection(connected, error = '', airplaneMode = false) {
      if (!active) return;
      noticeSequence += 1;
      const notice = connectionNotice(connected, error, airplaneMode);
      clearTimeout(noticeTimer.current);
      setNoticeMessage(notice.message);
      setNoticeError(notice.error ? notice.message : '');
      setWindowNotice(true);
      if (notice.durationMs) noticeTimer.current = setTimeout(() => { if (active) setWindowNotice(false); }, notice.durationMs);
    }
    async function showOffline() {
      const sequence = ++noticeSequence;
      let airplaneMode = false;
      if (Platform.OS === 'android') {
        try { airplaneMode = await Network.isAirplaneModeEnabledAsync(); } catch { /* Fall back to Not Connected. */ }
      }
      if (active && sequence === noticeSequence) showConnection(false, '', airplaneMode);
    }
    const performLoad = async (force = false) => {
      if (running) return;
      running = true;
      try {
        const partition = await tokenPartition();
        if (feedbackPartition.current !== partition) {
          feedbackPartition.current = partition;
          if (active) setSyncEvents({});
        }
        let scope = await flightScope();
        const store = await flightStore();
        const readRows = async account => {
          const draft = flightDraftRow(await localDraftStore.load(draftKey(account, 'flight', 'new')));
          return [...(draft ? [draft] : []), ...await store.list(account),
            ...(await store.deletedRecords(account)).filter(row => row.needs_attention)];
        };
        const local = await readRows(scope);
        if (active) { setData(local); setRecordScope(scope); }
        const beforePending = await logbookPendingCount(store, [scope, aircraftScope(scope), tailnumberScope(scope)]);
        const snapshot = await store.reference(scope, 'flight-window-sync');
        const needsRefresh = shouldRefreshLogbook({ force, pending: beforePending, hasSnapshot: Boolean(snapshot[0]?.downloaded_at) });
        let downloaded = false;
        let connected = false;
        let syncError = '';
        try {
          const network = await NetInfo.fetch();
          if (canAttemptApiSync(network, api.defaults.baseURL)) {
            if (needsRefresh) {
              scope = await syncFlightData();
              await refreshFlightCache(scope);
              await fetchTailnumbers();
              downloaded = true;
            } else {
              // Verify the app server, rather than treating Wi-Fi as proof of connection.
              await api.get('/api/mobile/session/', { timeout: 5000 });
            }
            connected = true;
          }
        } catch (error) {
          const result = syncConnectionFailure(error);
          connected = result.connected;
          syncError = result.error;
        }
        if (await tokenPartition() !== partition) return;
        scope = await flightScope();
        const rows = await readRows(scope);
        const legacy = await AsyncStorage.getItem('offlineFlights');
        const legacyCount = legacy ? JSON.parse(legacy).length : 0;
        if (active) {
          const completed = [...new Set([...completedFlightSyncs(local, rows), ...recordSyncFeedback.take(scope, rows)])];
          if (completed.length) {
            const confirmedAt = Date.now();
            setSyncEvents(previous => ({ ...previous, ...Object.fromEntries(completed.map(key => [key, confirmedAt])) }));
          }
          setData(rows);
          setRecordScope(scope);
          if (needsRefresh && downloaded) setReminderRefresh(previous => previous + 1);
          if (!connected && !syncError) await showOffline();
          else showConnection(connected, syncError);
          setStatus(`${legacyCount ? 'Older flights need review.' : ''}`);
        }
      } catch (error) {
        if (active) {
          showConnection(false, 'Could not open logbook.\nPull down to retry.');
          setStatus('');
        }
      } finally {
        running = false;
      }
    };
    let currentLoad = null;
    const load = (force = false) => {
      if (currentLoad) return currentLoad;
      currentLoad = performLoad(force).finally(() => { currentLoad = null; });
      return currentLoad;
    };
    load();
    refreshRef.current = load;
    const retryTimer = setInterval(async () => {
      if (AppState.currentState !== 'active') return;
      try {
        const store = await flightStore();
        const scope = await flightScope();
        if (await logbookPendingCount(store, [scope, aircraftScope(scope), tailnumberScope(scope)])) load();
      } catch (error) { /* A foreground refresh will display storage errors. */ }
    }, 30000);
    const foreground = AppState.addEventListener('change', state => {
      if (state === 'active') load();
    });
    const stopAutoSync = subscribeAutoSync((event, error) => {
      if (!active) return;
      if (event === 'completed') {
        setReminderRefresh(previous => previous + 1);
        load();
      } else if (event === 'failed') {
        const result = syncConnectionFailure(error);
        if (!result.connected && !result.error) showOffline();
        else showConnection(result.connected, result.error);
      }
    });
    let wasConnected;
    const unsubscribe = NetInfo.addEventListener(state => {
      const online = canAttemptApiSync(state, api.defaults.baseURL);
      if (wasConnected === false && online) load();
      if (!online && wasConnected !== false) showOffline();
      wasConnected = online;
    });
    return () => {
      active = false;
      clearTimeout(noticeTimer.current);
      setWindowNotice(false);
      refreshRef.current = null;
      foreground.remove();
      clearInterval(retryTimer);
      unsubscribe();
      stopAutoSync();
    };
  }, [deletedFlightId]));
  const refreshRef = React.useRef(null);

  const onRefresh = React.useCallback(async () => {
    if (!refreshRef.current || manualRefreshRunning.current) return;
    manualRefreshRunning.current = true;
    setManualRefreshing(true);
    try {
      await refreshRef.current(true);
    } finally {
      manualRefreshRunning.current = false;
      if (mounted.current) setManualRefreshing(false);
    }
  }, []);

  const renderItem = ({ item }) => (
    <FlightRow item={item} navigation={navigation} style={styles.touchable} scope={recordScope}
      syncEvent={syncEvents[item.local_id]}
      removalProgress={item.local_id === deletedFlightId ? removalProgress : null} />
  );

  return (
    <SafeAreaView edges={["left", "right", "bottom"]} style={styles.container}>
      <FlatList
        testID="flight-list"
        // The reminder header changes height as cards expand, hide and restore.
        // Android's native subview clipping can cut off its measured contents.
        removeClippedSubviews={false}
        ListHeaderComponentStyle={styles.listHeader}
        ListHeaderComponent={<>
      <Animated.View pointerEvents="none" accessibilityElementsHidden={!windowNotice}
        importantForAccessibility={windowNotice ? 'auto' : 'no-hide-descendants'}
        style={{ overflow: 'hidden', opacity: noticeProgress,
          height: noticeProgress.interpolate({ inputRange: [0, 1], outputRange: [0, noticeHeight] }) }}>
        <Text onLayout={event => setNoticeHeight(event.nativeEvent.layout.height)}
          style={[styles.syncNoticeText, { color: noticeError ? STYLES.danger : STYLES.muted }]} accessibilityLiveRegion="polite">
          {noticeError || noticeMessage}
        </Text>
      </Animated.View>
      {status.trim() ? <Text style={{ paddingHorizontal: 10, paddingVertical: 4, textAlign: 'center', color: STYLES.danger }} accessibilityLiveRegion="polite">{status}</Text> : null}
      <LogbookReminders onFeedback={setReminderFeedback} refreshVersion={reminderRefresh} style={styles.reminderList} scrollable={false} />
        </>}
        alwaysBounceVertical
        data={data}
        extraData={syncEvents}
        renderItem={renderItem}
        keyExtractor={item => item.local_id}
        contentContainerStyle={styles.flightListContent}
        refreshControl={
          <RefreshControl refreshing={manualRefreshing} onRefresh={onRefresh}
            tintColor={STYLES.blue} colors={[STYLES.blue]} progressBackgroundColor={STYLES.itemBackground} />
        }
      />
      <ReminderFeedback feedback={reminderFeedback} onClose={setReminderFeedback} placement="inline" />
      <BottomCreateButton title="New Flight" onPress={() => navigation.navigate("FlightCreate")} />
    </SafeAreaView>
  );
};

function FlightRow({ item, navigation, style, syncEvent, removalProgress, scope }) {
  const { colors } = useAppTheme();
  const [height, setHeight] = useState(0);
  const removing = Boolean(removalProgress);
  // Let the tint appear before the row starts fading and closing up.
  const exit = removalProgress?.interpolate({ inputRange: [0, 0.75, 1], outputRange: [0, 1, 1] });
  return (
    <Animated.View
      pointerEvents={removing ? "none" : "auto"}
      accessibilityElementsHidden={removing}
      importantForAccessibility={removing ? "no-hide-descendants" : "auto"}
      onLayout={event => { if (!removing) setHeight(event.nativeEvent.layout.height); }}
      style={removing ? {
        overflow: "hidden",
        opacity: exit,
        height: height ? Animated.multiply(exit, height) : undefined,
      } : undefined}
    >
      <TouchableOpacity
        testID={`flight-row-${item.local_id ?? item.id}`}
        activeOpacity={0.7}
        disabled={removing}
        style={style}
        onPress={() => item.is_draft ? navigation.navigate("FlightCreate") : item.needs_attention
          ? reviewRecord(navigation, "flight", item)
          : navigation.navigate("FlightDetail", { item })}
      >
        <FlightItem item={item} navigation={navigation} scope={scope}
          syncEvent={syncEvent}
          date={item.date}
          route={item.route}
          type={item.aircraft_type}
          reg={item.registration}
          dur={item.duration}
          crew={flightCrewLabel(item)}
          dayL={item.landings_day ? item.landings_day : 0}
          nitL={item.landings_night ? item.landings_night : 0}
        />
        {removing && <Animated.View pointerEvents="none" style={[StyleSheet.absoluteFill, {
          borderRadius: 10,
          backgroundColor: colors.actionDanger,
          opacity: removalProgress.interpolate({ inputRange: [0, 0.75, 1], outputRange: [0.4, 0.4, 0] }),
        }]} />}
      </TouchableOpacity>
    </Animated.View>
  );
}

const createStyles = STYLES => StyleSheet.create({
  container: {
    width: "100%",
    flex: 1,
    backgroundColor: STYLES.itemBackground,
  },
  listHeader: {
    overflow: 'visible',
  },
  reminderList: {
    flexGrow: 0,
    flexShrink: 0,
    overflow: 'visible',
    paddingBottom: 8,
  },
  flightListContent: {
    flexGrow: 1,
    padding: LOGBOOK_INSET,
  },
  syncNoticeText: {
    position: 'absolute',
    left: 0,
    right: 0,
    paddingHorizontal: 12,
    // The list adds 12 points of space below the notice.
    paddingTop: 16,
    paddingBottom: 4,
    includeFontPadding: false,
    textAlign: 'center',
  },
  item: {
    width: "100%",
    backgroundColor: STYLES.elementBackground,
    padding: 10,
    marginTop: 2,
    marginRight: 10,
    marginLeft: 10,
  },
  text: {
    fontSize: 16,
    justifyContent: "space-between",
    color: STYLES.blue,
  },
  touchable: {
    alignItems: "center",
    borderRadius: 10,
    padding: 0,
    marginBottom: 6,
  },
});

export default FlightListScreen;
