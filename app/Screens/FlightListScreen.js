import { reviewRecord } from '../components/RecordIssue';
import { internetAvailable, subscribeAutoSync } from '../api/autoSync.mjs';
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
import fetchTailnumbers from "../api/fetchTailnumbers";
import { flightStore, flightScope, tokenPartition, refreshFlightCache } from "../storage/flights";
import { aircraftScope } from "../storage/aircraft";
import AsyncStorage from "@react-native-async-storage/async-storage";

const LOGBOOK_INSET = 12;

const FlightListScreen = ({ navigation, route }) => {
  const { styles: STYLES } = useAppTheme();
  const styles = useMemo(() => createStyles(STYLES), [STYLES]);

  // removeAsyncData('offlineFlights')

  const [refreshing, setRefreshing] = useState(false);
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
  const feedbackPartition = React.useRef(null);
  const [windowNotice, setWindowNotice] = useState(true);
  const [loadingFlights, setLoadingFlights] = useState(false);
  const [noticeMessage, setNoticeMessage] = useState("Loading saved flights…");
  const [noticeError, setNoticeError] = useState("");
  const [noticeHeight, setNoticeHeight] = useState(38);
  const noticeProgress = React.useRef(new Animated.Value(1)).current;
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
    const load = async (force = false) => {
      if (running) return;
      running = true;
      if (active) {
        clearTimeout(noticeTimer.current);
        setLoadingFlights(false);
        setNoticeMessage("Loading saved flights…");
        setWindowNotice(true);
      }
      try {
        const partition = await tokenPartition();
        if (feedbackPartition.current !== partition) {
          feedbackPartition.current = partition;
          if (active) setSyncEvents({});
        }
        let scope = await flightScope();
        const store = await flightStore();
        const readRows = async account => [...await store.list(account),
          ...(await store.deletedRecords(account)).filter(row => row.needs_attention)];
        const local = await readRows(scope);
        if (active) setData(local);
        const beforePending = await logbookPendingCount(store, [scope, aircraftScope(scope), tailnumberScope(scope)]);
        const snapshot = await store.reference(scope, 'flight-window-sync');
        const needsRefresh = shouldRefreshLogbook({ force, pending: beforePending, hasSnapshot: Boolean(snapshot[0]?.downloaded_at) });
        let downloaded = true;
        let serverUpgradeNeeded = false;
        if (needsRefresh) {
          if (active) setLoadingFlights(true);
          try {
            const network = await NetInfo.fetch();
            if (!internetAvailable(network)) throw new Error('Offline');
            try {
              scope = await syncFlightData();
            } catch (error) {
              if (error.response?.status !== 404) throw error;
              serverUpgradeNeeded = true;
            }
            await refreshFlightCache(scope);
            await fetchTailnumbers();
          } catch (error) {
            downloaded = false;
          }
        }
        if (await tokenPartition() !== partition) return;
        scope = await flightScope();
        const rows = await readRows(scope);
        const pending = await logbookPendingCount(store, [scope, aircraftScope(scope), tailnumberScope(scope)]);
        const legacy = await AsyncStorage.getItem('offlineFlights');
        const legacyCount = legacy ? JSON.parse(legacy).length : 0;
        if (active) {
          const completed = [...new Set([...completedFlightSyncs(local, rows), ...recordSyncFeedback.take(scope, rows)])];
          if (completed.length) {
            const confirmedAt = Date.now();
            setSyncEvents(previous => ({ ...previous, ...Object.fromEntries(completed.map(key => [key, confirmedAt])) }));
          }
          setData(rows);
          if (needsRefresh && downloaded) setReminderRefresh(previous => previous + 1);
          setNoticeMessage(pending ? "Saved on this device." : !downloaded ? "Showing saved flights." : needsRefresh ? "Synced last 100 entries" : "No sync required.");
          clearTimeout(noticeTimer.current);
          setNoticeError(serverUpgradeNeeded ? 'App update required.' : '');
          setWindowNotice(true);
          noticeTimer.current = setTimeout(() => setWindowNotice(false), needsRefresh ? 3000 : 1000);
          setStatus(`${legacyCount ? 'Older flights need review.' : ''}`);
        }
      } catch (error) {
        if (active) {
          setWindowNotice(true);
          setNoticeError('Could not open logbook.\nPull down to retry.');
          setStatus('');
        }
      } finally {
        running = false;
        if (active) {
          setLoadingFlights(false);
          setRefreshing(false);
        }
      }
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
    const stopAutoSync = subscribeAutoSync(event => {
      if (!active) return;
      if (event === 'started') {
        setNoticeError('');
        setLoadingFlights(true);
        setWindowNotice(true);
      } else if (event === 'completed') {
        setReminderRefresh(previous => previous + 1);
        load();
      }
      else if (event === 'failed') {
        setLoadingFlights(false);
        setNoticeError('');
        setNoticeMessage('Saved on this device.');
        clearTimeout(noticeTimer.current);
        noticeTimer.current = setTimeout(() => setWindowNotice(false), 1500);
        setWindowNotice(true);
      }
    });
    let wasConnected;
    const unsubscribe = NetInfo.addEventListener(state => {
      const online = internetAvailable(state);
      if (wasConnected === false && online) load();
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

  const onRefresh = React.useCallback(() => {
    if (!refreshRef.current) return;
    setRefreshing(true);
    refreshRef.current(true);
  }, []);

  const renderItem = ({ item }) => (
    <FlightRow item={item} navigation={navigation} style={styles.touchable}
      syncEvent={syncEvents[item.local_id]}
      removalProgress={item.local_id === deletedFlightId ? removalProgress : null} />
  );

  return (
    <SafeAreaView edges={["left", "right", "bottom"]} style={styles.container}>
      <Animated.View pointerEvents="none" accessibilityElementsHidden={!windowNotice}
        importantForAccessibility={windowNotice ? 'auto' : 'no-hide-descendants'}
        style={{ overflow: 'hidden', opacity: noticeProgress,
          height: noticeProgress.interpolate({ inputRange: [0, 1], outputRange: [0, noticeHeight] }) }}>
        <Text onLayout={event => setNoticeHeight(event.nativeEvent.layout.height)}
          style={[styles.syncNoticeText, { color: noticeError ? STYLES.danger : STYLES.muted }]} accessibilityLiveRegion="polite">
          {noticeError || (loadingFlights ? "Sync in Progress" : noticeMessage)}
        </Text>
      </Animated.View>
      {status.trim() ? <Text style={{ paddingHorizontal: 10, paddingVertical: 4, textAlign: 'center', color: STYLES.black }} accessibilityLiveRegion="polite">{status}</Text> : null}
      <LogbookReminders refreshVersion={reminderRefresh} style={styles.reminderList} />
      <FlatList
        testID="flight-list"
        data={data}
        extraData={syncEvents}
        renderItem={renderItem}
        keyExtractor={item => item.local_id}
        contentContainerStyle={styles.flightListContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      />
      <BottomCreateButton title="New Flight" onPress={() => navigation.navigate("FlightCreate")} />
    </SafeAreaView>
  );
};

function FlightRow({ item, navigation, style, syncEvent, removalProgress }) {
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
        activeOpacity={0.7}
        disabled={removing}
        style={style}
        onPress={() => item.needs_attention
          ? reviewRecord(navigation, "flight", item)
          : navigation.navigate("FlightDetail", { item })}
      >
        <FlightItem item={item} navigation={navigation}
          syncEvent={syncEvent}
          date={item.date}
          route={item.route}
          type={item.aircraft_type}
          reg={item.registration}
          dur={item.duration}
          crew={item.second_in_command ? "SIC" : "PIC"}
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
  reminderList: {
    flexGrow: 0,
    maxHeight: '30%',
    marginHorizontal: LOGBOOK_INSET,
  },
  flightListContent: {
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
