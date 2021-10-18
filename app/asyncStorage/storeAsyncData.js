import AsyncStorage from "@react-native-async-storage/async-storage";

const storeAsyncData = async (key, value) => {
  try {
    await AsyncStorage.setItem(key, value);
  } catch (e) {
    // saving error
  }
  console.log(value, "from storeAsyncData");
};

export default storeAsyncData;
