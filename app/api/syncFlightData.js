import * as Network from 'expo-network';
import api from "./axiosConfig";
import getAsyncObject from "../asyncStorage/getAsyncObject";
import removeAsyncData from '../asyncStorage/removeAsyncData';
import { useContext } from 'react';
import AppContext from '../components/AppContext';


const syncFlightData = async (props) => {

    // removeAsyncData('offlineFlights')

    const Context = useContext(AppContext)

    const networkState = await Network.getNetworkStateAsync()
    const offlineFlights = await getAsyncObject('offlineFlights')

    if (networkState.isInternetReachable === true) {
      
        for (i in offlineFlights) {
          console.log(offlineFlights[i])
          
        //   api
        //     .post("/api/flights/", offlineFlights[i])
        //     .then((response) => {
        //       offlineFlights.splice(index, i)
        //       console.log(offlineFlights.length)
        //       Context.setActivityVisible(false);
        //     })
        //     .catch(function (error) {
        //       console.log(error.response.data);
        //       Context.setActivityVisible(false);
        //       Alert.alert("An error occurred. \n Please try again.");
        //     });
        }
      }
      
    else{
        console.log(networkState)
      }
    
    

}



export default syncFlightData;