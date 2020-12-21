import AsyncStorage from "@react-native-async-storage/async-storage";

const removeValue = async (key) => {
  try {
    await AsyncStorage.removeItem(key);
  } catch (e) {
    // remove error
  }

  console.log("Done.");
};

export default removeValue;
