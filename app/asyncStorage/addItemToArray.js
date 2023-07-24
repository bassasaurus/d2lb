import AsyncStorage from '@react-native-async-storage/async-storage';
import getAsyncObject from './getAsyncObject';
import storeAsyncObject from './storeAsyncObject';

const addItemToArray = async (key, item) => {

    

    if (await AsyncStorage.getItem(key) === null){
        let array = []
        let unsyncedFlights = array.concat(item)
        
        storeAsyncObject(key, unsyncedFlights)
    }
    else {
        const array = await getAsyncObject(key)
        let newArray = array.concat(item)

        console.log(JSON.stringify(newArray, null, 2))
        
        storeAsyncObject(key, newArray)
    }
    
  };
  

  export default addItemToArray;