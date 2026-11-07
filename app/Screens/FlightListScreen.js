import { reviewRecord } from '../components/RecordIssue';
import { internetAvailable, subscribeAutoSync } from '../api/autoSync.mjs';
import { completedFlightSyncs, flightSyncFeedback } from '../api/flightSyncFeedback.mjs';
import { FlatList } from '../components/OverflowLists';
import { tailnumberScope } from '../storage/tailnumberRecords.mjs';
import { shouldRefreshLogbook, logbookPendingCount } from '../api/logbookRefresh.mjs';
import { useMemo } from 'react';
import React, { useState, useEffect} from "react";
import { Animated, StyleSheet, TouchableOpacity, RefreshControl, Alert } from 'react-native';
import { SafeAreaView } from "react-native-safe-area-context";
import { useNavigation, useFocusEffect, useIsFocused } from "@react-navigation/native";
import { useAppTheme } from '../theme/ThemeProvider';
import syncFlightData from "../api/syncFlightData";
import FlightItem from "../components/FlightItem";
import BottomCreateButton from "../components/BottomCreateButton";
import AppContext from "../components/AppContext";
import { Text, AppState } from "react-native";
import NetInfo from "@react-native-community/netinfo";
import fetchTailnumbers from "../api/fetchTailnumbers";
import { flightStore, flightScope, tokenPartition, refreshFlightCache } from "../storage/flights";
import { aircraftScope } from "../storage/aircraft";
import AsyncStorage from "@react-native-async-storage/async-storage";

const FlightListScreen = () => {
  const { styles: STYLES } = useAppTheme();
  const styles = useMemo(() => createStyles(STYLES), [STYLES]);

  // removeAsyncData('offlineFlights')

  const [refreshing, setRefreshing] = useState(false);
  const navigation = useNavigation();
  const [data, setData] = useState([]);
  const [syncEvents, setSyncEvents] = useState({});
  const feedbackPartition = React.useRef(null);
  const [windowNotice, setWindowNotice] = useState(true);
  const [loadingFlights, setLoadingFlights] = useState(false);
  const [noticeMessage, setNoticeMessage] = useState("Loading saved flights…");
  const [noticeError, setNoticeError] = useState("");
  const [noticeHeight, setNoticeHeight] = useState(26);
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
          const completed = [...new Set([...completedFlightSyncs(local, rows), ...flightSyncFeedback.take(scope, rows)])];
          if (completed.length) {
            const confirmedAt = Date.now();
            setSyncEvents(previous => ({ ...previous, ...Object.fromEntries(completed.map(key => [key, confirmedAt])) }));
          }
          setData(rows);
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
      } else if (event === 'completed') load();
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
  }, []));
  const refreshRef = React.useRef(null);

  const onRefresh = React.useCallback(() => {
    setRefreshing(true);
    refreshRef.current?.(true);
  }, []);

  const renderItem = ({ item }) => (
    <TouchableOpacity
      activeOpacity={0.7}
      style={styles.touchable}
      onPress={() =>
        item.needs_attention ? reviewRecord(navigation, "flight", item) : navigation.navigate("FlightDetail", {
          item: item,
        })
      }
    >
      <FlightItem item={item} navigation={navigation}
        syncEvent={syncEvents[item.local_id]}
        id={item.sync_state === "synced" ? item.id : null}
        date={item.date}
        route={item.route}
        type={item.aircraft_type}
        reg={item.registration}
        dur={item.duration}
        crew={item.second_in_command ? "SIC" : "PIC"}
        dayL={item.landings_day ? item.landings_day : 0}
        nitL={item.landings_night ? item.landings_night : 0}
      />
    </TouchableOpacity>
  );

  return (
    <SafeAreaView edges={["left", "right", "bottom"]} style={styles.container}>
      <Animated.View pointerEvents="none" accessibilityElementsHidden={!windowNotice}
        importantForAccessibility={windowNotice ? 'auto' : 'no-hide-descendants'}
        style={{ overflow: 'hidden', opacity: noticeProgress,
          height: noticeProgress.interpolate({ inputRange: [0, 1], outputRange: [0, noticeHeight] }) }}>
        <Text onLayout={event => setNoticeHeight(event.nativeEvent.layout.height)}
          style={{ position: 'absolute', left: 0, right: 0, paddingHorizontal: 10, paddingVertical: 4, textAlign: 'center', color: noticeError ? STYLES.danger : STYLES.muted }} accessibilityLiveRegion="polite">
          {noticeError || (loadingFlights ? "Sync in Progress" : noticeMessage)}
        </Text>
      </Animated.View>
      {status.trim() ? <Text style={{ paddingHorizontal: 10, paddingVertical: 4, textAlign: 'center', color: STYLES.black }} accessibilityLiveRegion="polite">{status}</Text> : null}
      <FlatList
        testID="flight-list"
        data={data}
        extraData={syncEvents}
        renderItem={renderItem}
        keyExtractor={item => item.local_id}
        contentContainerStyle={{ padding: 12 }}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      />
      <BottomCreateButton title="New Flight" onPress={() => navigation.navigate("FlightCreate")} />
    </SafeAreaView>
  );
};

const createStyles = STYLES => StyleSheet.create({
  container: {
    width: "100%",
    flex: 1,
    backgroundColor: STYLES.itemBackground,
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
