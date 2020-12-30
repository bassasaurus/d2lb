import AsyncStorage from "@react-native-async-storage/async-storage";

const getData = async (key) => {
  try {
    const value = await AsyncStorage.getItem(key);
    if (value !== null) {
      // value previously stored
      console.log(value, "from getData.js");
      return value;
    }
  } catch (e) {
    console.log("error retrieving token");
    // error reading value
  }
};

export default getData;
