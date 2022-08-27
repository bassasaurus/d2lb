import AsyncStorage from "@react-native-async-storage/async-storage";

const getAsyncObject = async (key) => {
  try {
    const jsonValue = await AsyncStorage.getItem(key);
    return jsonValue != null ? JSON.parse(jsonValue) : null;
  } catch (e) {
    console.log("async object error");
  }
};

export default getAsyncObject;
