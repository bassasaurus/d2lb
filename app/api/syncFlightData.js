import * as Network from 'expo-network';
import api from "./axiosConfig";
import getAsyncObject from "../asyncStorage/getAsyncObject";
import removeAsyncData from '../asyncStorage/removeAsyncData';


const syncFlightData = async (props) => {

    // removeAsyncData('offlineFlights')

    const networkState = await Network.getNetworkStateAsync()
    const offlineFlights = await getAsyncObject('offlineFlights')

    if (networkState.isInternetReachable === true) {
      
        for (i in unsyncedFlights) {
          console.log(unsyncedFlights[i])
          Context.setActivityVisible(true);
        //   api
        //     .post("/api/flights/", unsyncedFlights[i])
        //     .then((response) => {
        //       unsyncedFlights.splice(index, i)
        //       console.log(unsyncedFlights.length)
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