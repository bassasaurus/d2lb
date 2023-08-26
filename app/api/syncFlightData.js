import * as Network from 'expo-network';
import api from "./axiosConfig";
import getAsyncObject from "../asyncStorage/getAsyncObject";
import removeAsyncData from '../asyncStorage/removeAsyncData';
import { useContext } from 'react';
import AppContext from '../components/AppContext';
import { Alert } from 'react-native';
import storeAsyncData from '../asyncStorage/storeAsyncData';
import storeAsyncObject from '../asyncStorage/storeAsyncObject';


const syncFlightData = async (props) => {

    const networkState = await Network.getNetworkStateAsync()
    const offlineFlights = await getAsyncObject('offlineFlights')

    if (networkState.isInternetReachable === true) {
      
        for (i in offlineFlights) {
          
          api
            .post("/api/flights/", offlineFlights[i])
            .then((response) => {
              
            })
            .catch(function (error) {
              console.log(error);
              
              Alert.alert("An error occurred. \n Please try again.");
            });


            storeAsyncObject('offlineFlights', offlineFlights.splice(i, 1))
        }
      }
      
    else{
        console.log(networkState)
      }
    
    

}



export default syncFlightData;