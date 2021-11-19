import AsyncStorage from "@react-native-async-storage/async-storage";

const removeAsyncData = async (key) => {
  try {
    await AsyncStorage.removeItem(key);
  } catch (e) {
    // remove error
  }
};

export default removeAsyncData;
