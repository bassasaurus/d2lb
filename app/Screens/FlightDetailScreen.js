import RecordIssue from '../components/RecordIssue';
import { useFocusEffect } from '@react-navigation/native';
import Card from '../components/Card';
import { ScrollView } from '../components/OverflowLists';
import { routeFitCoordinates, routeMapPadding, validCoordinate } from '../maps/routeBounds.mjs';
import FlightHeader from '../components/FlightHeader';
import { useMemo } from 'react';
import React, { useRef, useContext, useState, useEffect } from "react";
import MapView, { Marker, Polyline } from "react-native-maps";
import { StyleSheet, View, Alert, TouchableOpacity } from "react-native";

import { useAppTheme } from '../theme/ThemeProvider';
import ActivityModal from "../components/ActivityModal";
import { flightStore, flightScope } from "../storage/flights";
import AppContext from "../components/AppContext";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import AppText from "../components/AppText";
import Separator from "../components/Separator";
import DetailsPanel from "../components/DetailsPanel";
import { DARK_MAP_STYLE } from "../theme/mapStyle";
import RecordActions from "../components/RecordActions";
import * as Device from "expo-device";

// import { PROVIDER_GOOGLE } from "react-native-maps";




function FlightDetailScreen({ route, navigation }) {
  const { styles: STYLES, colors, isDark } = useAppTheme();
  const styles = useMemo(() => createStyles(STYLES), [STYLES]);
  const mapRef = useRef(null);
  const Context = useContext(AppContext);
  const localId = route.params.item.local_id;
  useFocusEffect(React.useCallback(() => {
    let active = true;
    const reload = async () => {
      const current = (await (await flightStore()).list(await flightScope())).find(row => row.local_id === localId);
      if (active && current) navigation.setParams({ item: current });
    };
    reload().catch(() => {});
    const timer = setInterval(() => reload().catch(() => {}), 3000);
    return () => { active = false; clearInterval(timer); };
  }, [localId]));

  const [mapReady, setMapReady] = useState(false);
  const [mapSize, setMapSize] = useState({ width: 0, height: 0 });
  const markers = (route.params.item.app_markers || []).filter(marker => validCoordinate(marker.coordinates));
  const polylines = (route.params.item.app_polylines?.coordinates || []).filter(validCoordinate);
  const fitCoordinates = routeFitCoordinates(polylines, markers);
  const fitKey = JSON.stringify(fitCoordinates);
  const hasMap = fitCoordinates.length > 0;
  useEffect(() => {
    if (!mapReady || !mapSize.width || !mapSize.height || !hasMap) return;
    let active = true;
    requestAnimationFrame(() => {
      if (!active || !mapRef.current) return;
      if (fitCoordinates.length === 1) {
        mapRef.current.animateToRegion({ ...fitCoordinates[0], latitudeDelta: 0.05, longitudeDelta: 0.05 }, 0);
      } else {
        mapRef.current.fitToCoordinates(fitCoordinates, {
          edgePadding: routeMapPadding(mapSize.width, mapSize.height), animated: false,
        });
      }
    });
    return () => { active = false; };
  }, [mapReady, mapSize.width, mapSize.height, fitKey]);

  const deleteItem = async () => {
    try {
      await (await flightStore()).remove(await flightScope(), route.params.item.local_id);
      navigation.goBack();
    } catch (error) {
      Alert.alert("Flight not deleted", "Please try again.");
    } finally {
      Context.setActivityVisible(false);
    }
  };

  const showAlert = (primary_key, date, route) =>
    Alert.alert("Are you sure?", "This can't be undone", [
      {
        text: "Delete",
        style: "destructive",
        onPress: () => {
          deleteItem(primary_key, date, route);
          Context.setActivityVisible(true);
        },
      },
      { text: "Cancel", style: "cancel" },
    ]);

  return (
    <View style={styles.container}>
      <ScrollView style={{ maxHeight: hasMap ? '55%' : undefined, flexGrow: hasMap ? 0 : 1, margin: 12 }}>
        <Card>
        <RecordIssue item={route.params.item} kind="flight" navigation={navigation} />
        {/* first row */}

        <FlightHeader date={route.params.item.date} type={route.params.item.aircraft_type}
          reg={route.params.item.registration} dur={route.params.item.duration} />
        {/* second row */}
        <Separator />
        <DetailsPanel route={route}></DetailsPanel>
        {/* sixth row */}
        <Separator />
        <RecordActions recordName="flight"
          onDelete={() => showAlert(route.params.item.id, route.params.item.date, route.params.item.route)}
          onUpdate={() => navigation.navigate("FlightUpdate", { item: route.params.item })}
        />
        </Card>
      </ScrollView>

      {hasMap && <View style={styles.mapView}>
        <MapView
          // provider= {Device.osName === "android" ? PROVIDER_GOOGLE : null}
          style={{ position: "absolute", top: 0, right: 0, bottom: 0, left: 0 }}
          customMapStyle={isDark ? DARK_MAP_STYLE : []}
          userInterfaceStyle={isDark ? "dark" : "light"}
          ref={mapRef}
          onMapReady={() => setMapReady(true)}
          onLayout={event => {
            const { width, height } = event.nativeEvent.layout;
            setMapSize(previous => previous.width === width && previous.height === height ? previous : { width, height });
          }}
          maxZoomLevel={14}
          toolbarEnabled={false}
        >
          {markers.map((marker) => (
            <Marker
              key={marker.key}
              coordinate={marker.coordinates}
              title={marker.title}
              anchor={{ x: 0.5, y: 0.5 }}
            >
              <View style={[styles.airportLabel, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                <AppText numberOfLines={1} size={12} weight="600" color={colors.primary}>
                  {marker.iata || marker.icao || marker.title}
                </AppText>
              </View>
            </Marker>
          ))}

          {/* add logic for circle here */}
          <Polyline
            strokeColor={STYLES.blue}
            strokeWidth={2}
            geodesic={true}
            coordinates={polylines}
          />
        </MapView>
      </View>

      }
      <ActivityModal visible={Context.activityVisibleValue}></ActivityModal>
    </View>
  );
}

const createStyles = STYLES => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: STYLES.itemBackground,
    flexDirection: "column",
    justifyContent: "flex-start",
  },
  detailsPanel: {
    flexDirection: "column",
    width: "100%",
    margin: 0,
    backgroundColor: STYLES.white,
    borderRadius: STYLES.borderRadius,
    padding: STYLES.borderRadius,
    backgroundColor: STYLES.white,
    borderRadius: STYLES.borderRadius,
  },
  mapView: { flex: 1, minHeight: 120, marginHorizontal: 12, marginBottom: 12, borderRadius: 10, overflow: 'hidden' },
  airportLabel: {
    minWidth: 42, maxWidth: 100, paddingHorizontal: 6, paddingVertical: 3,
    borderWidth: 1, borderRadius: 4, alignItems: "center",
  },
  rowContainer: {
    flexDirection: "row",
    paddingBottom: 5,
  },
  firstColumn: {
    flex: 1.1,
    flexDirection: "column",
  },
  secondColumn: {
    flex: 2,
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
  },
  thirdColumn: {
    flex: 1,
    flexDirection: "column",
    alignItems: "flex-end",
  },

  text: {
    fontFamily: STYLES.font,
    color: STYLES.blue,
  },
});

export default FlightDetailScreen;
