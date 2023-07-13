import AsyncStorage from '@react-native-async-storage/async-storage';


const addAsyncObject = async (key, item) => {
    try {
      // Retrieve the existing array from AsyncStorage
      const existingArray = await AsyncStorage.getItem(key);
      let newArray = [];
  
      if (existingArray !== null) {
        // If an array already exists, parse it and add the new item
        newArray = JSON.parse(existingArray);
      }
  
      newArray.push(item);
  
      // Save the updated array back to AsyncStorage
      await AsyncStorage.setItem(key, JSON.stringify(newArray));
    } catch (error) {
      // Error handling
      console.log(error);
    }
  };

  export default addAsyncObject;