import AsyncStorage from "@react-native-async-storage/async-storage";

const getAsyncObject = async (value) => {
  try {
    const jsonValue = await AsyncStorage.getItem(value);
    return jsonValue != null ? JSON.parse(jsonValue) : null;
  } catch (e) {
    // error reading value
  }
};

export default getAsyncObject;
