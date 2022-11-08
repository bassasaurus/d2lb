import AsyncStorage from "@react-native-async-storage/async-storage";

const getAsyncData = async (key) => {
  try {
    const value = await AsyncStorage.getItem(key);
    if (value !== null) {
      return value;
    }
  } catch (e) {
    // error reading value
  }
};

export default getAsyncData;
