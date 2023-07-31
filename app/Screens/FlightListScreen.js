import React, { useState, useEffect, useContext} from "react";
import {
  SafeAreaView,
  FlatList,
  StyleSheet,
  TouchableOpacity,
  RefreshControl,
  Alert,
} from "react-native";
import { useNavigation } from "@react-navigation/native";
import { STYLES } from "../styles/styles";
import api from "../api/axiosConfig";
import FlightItem from "../components/FlightItem";
import RoundButton from "../components/RoundButton";
import AppContext from "../components/AppContext";
import storeAsyncObject from "../asyncStorage/storeAsyncObject";
import removeAsyncData from  "../asyncStorage/removeAsyncData"
import getAsyncObject from "../asyncStorage/getAsyncObject";
import * as Network from 'expo-network';
import * as Device from 'expo-device';


const FlightListScreen = () => {
  const [refreshing, setRefreshing] = useState(false);
  const navigation = useNavigation();

  const Context = useContext(AppContext);
  

  const syncData = async () => {

    // removeAsyncData('offlineFlights')

    console.log('render')
    const networkState = await Network.getNetworkStateAsync()

    const offlineFlights = await getAsyncObject('offlineFlights')

    const response = await api.get("/api/flights/");
    storeAsyncObject('asyncFlights', response.data.results)
    const asyncFlights = await getAsyncObject('asyncFlights')

    if (offlineFlights === null){
      Context.setFlightList(asyncFlights)
    }
    else{
      Context.setFlightList(offlineFlights.concat(asyncFlights));
    }
    
  };

  useEffect(() => {
    const onFocus = navigation.addListener("focus", () => {
      syncData();
    });

    return onFocus;
  }, [navigation]);

  const wait = (timeout) => {
    return new Promise((resolve) => setTimeout(resolve, timeout));
  };

  const onRefresh = React.useCallback(() => {
    setRefreshing(true);
    syncData();
    wait(250).then(() => setRefreshing(false));
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
        id={item.id}
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
    <SafeAreaView style={styles.container}>
      <FlatList
        data={Context.flightListValue}
        renderItem={renderItem}
        keyExtractor={(item, index) => index}
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

const styles = StyleSheet.create({
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
