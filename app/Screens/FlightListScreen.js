import { tailnumberScope } from '../storage/tailnumberRecords.mjs';
import { useMemo } from 'react';
import React, { useState, useEffect} from "react";
import { FlatList, StyleSheet, TouchableOpacity, RefreshControl, Alert } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useNavigation, useFocusEffect, useIsFocused } from "@react-navigation/native";
import { useAppTheme } from '../theme/ThemeProvider';
import syncFlightData from "../api/syncFlightData";
import FlightItem from "../components/FlightItem";
import RoundButton from "../components/RoundButton";
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
  const [issueCount, setIssueCount] = useState(0);
  const [windowNotice, setWindowNotice] = useState(false);
  const noticeTimer = React.useRef(null);
  const [status, setStatus] = useState("Loading saved flights…");

  useFocusEffect(React.useCallback(() => {
    let active = true;
    let running = false;
    const load = async () => {
      if (running) return;
      running = true;
      try {
        const partition = await tokenPartition();
        let scope = await flightScope();
        const store = await flightStore();
        const local = await store.list(scope);
        if (active) setData(local);
        let downloaded = true;
        let serverUpgradeNeeded = false;
        try {
          const network = await NetInfo.fetch();
          if (!network.isConnected) throw new Error('Offline');
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
        if (await tokenPartition() !== partition) return;
        scope = await flightScope();
        const rows = await store.list(scope);
        const pending = await store.pendingCount(scope) + await store.pendingCount(tailnumberScope(scope));
        const issues = [...await store.errors(scope), ...await store.errors(aircraftScope(scope)), ...await store.errors(tailnumberScope(scope))];
        const legacy = await AsyncStorage.getItem('offlineFlights');
        const legacyCount = legacy ? JSON.parse(legacy).length : 0;
        if (active) {
          setData(rows);
          setIssueCount(issues.length);
          clearTimeout(noticeTimer.current);
          setWindowNotice(downloaded);
          if (downloaded) noticeTimer.current = setTimeout(() => setWindowNotice(false), 3000);
          setStatus(`${downloaded ? '' : 'Showing saved flights; sync could not finish.'} ${pending ? `${pending} pending change(s) saved on device.` : ""}${serverUpgradeNeeded ? ' Uploads waiting for the server sync update.' : ''}${issues.length ? ` Needs attention: ${issues.slice(0, 3).map(issue => `${issue.route}: ${issue.message}`).join(' ')}` : ''} ${legacyCount ? ' Older unsynced flights are preserved separately for review.' : ''}`);
        }
      } catch (error) {
        if (active) setStatus('Unable to open local logbook. Pull down to retry.');
      } finally {
        running = false;
        if (active) setRefreshing(false);
      }
    };
    load();
    refreshRef.current = load;
    const retryTimer = setInterval(async () => {
      if (AppState.currentState !== 'active') return;
      try {
        const store = await flightStore();
        const scope = await flightScope();
        if (await store.pendingCount(scope) + await store.pendingCount(tailnumberScope(scope))) load();
      } catch (error) { /* A foreground refresh will display storage errors. */ }
    }, 30000);
    const foreground = AppState.addEventListener('change', state => {
      if (state === 'active') load();
    });
    let wasConnected;
    const unsubscribe = NetInfo.addEventListener(state => {
      if (wasConnected === false && state.isConnected) load();
      wasConnected = state.isConnected;
    });
    return () => {
      active = false;
      clearTimeout(noticeTimer.current);
      setWindowNotice(false);
      refreshRef.current = null;
      foreground.remove();
      clearInterval(retryTimer);
      unsubscribe();
    };
  }, []));
  const refreshRef = React.useRef(null);

  const onRefresh = React.useCallback(() => {
    setRefreshing(true);
    refreshRef.current?.();
  }, []);

  const renderItem = ({ item }) => (
    <TouchableOpacity
      activeOpacity={0.7}
      style={styles.touchable}
      onPress={() =>
        navigation.navigate("FlightDetail", {
          item: item,
        })
      }
    >
      <FlightItem
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
      {windowNotice && <Text style={{ paddingHorizontal: 10, paddingVertical: 4, color: STYLES.muted }}>Synced last 100 entries</Text>}
      {status.trim() ? <Text style={{ paddingHorizontal: 10, paddingVertical: 4, color: STYLES.black }} accessibilityLiveRegion="polite">{status}</Text> : null}
      {issueCount > 0 && <TouchableOpacity accessibilityRole="button" onPress={() => navigation.navigate('SyncReview', { screen: 'SyncReviewList' })}>
        <Text style={{ padding: 10, color: STYLES.danger }}>Resolve sync problems ({issueCount})</Text>
      </TouchableOpacity>}
      <FlatList
        data={data}
        renderItem={renderItem}
        keyExtractor={item => item.local_id}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      />
      <RoundButton
        buttonSize={60}
        iconName='plus'
        buttonColor={STYLES.green}
        onPress={() => navigation.navigate("FlightCreate")}
      ></RoundButton>
    </SafeAreaView>
  );
};

const createStyles = STYLES => StyleSheet.create({
  container: {
    width: "100%",
    flex: 1,
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
    backgroundColor: STYLES.highlight,
    padding: 0,
    marginTop: 2,
  },
});

export default FlightListScreen;
