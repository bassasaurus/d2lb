import AsyncStorage from '@react-native-async-storage/async-storage';
import getAsyncObject from './getAsyncObject';
import storeAsyncObject from './storeAsyncObject';

const addItemToArray = async (key, item) => {

    if (await AsyncStorage.getItem(key) === null){
        let array = []
        let offlineFlights = array.concat(item)
        storeAsyncObject(key, offlineFlights)
    }
    else {
        const array = await getAsyncObject(key)
        let newArray = array.concat(item)
        storeAsyncObject(key, newArray)
    }
  };
  

  export default addItemToArray;