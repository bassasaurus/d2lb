import AsyncStorage from "@react-native-async-storage/async-storage";
import { useState, useEffect } from "react";

const getAsyncData = (key) => {
  const [value, setValue] = useState();
  useEffect(() => {
    const getData = async () => {
      try {
        const value = await AsyncStorage.getItem(key);
        if (value !== null) {
          // value previously stored
          // console.log(value, "from getAsyncData.js");
          setValue(value);
        }
      } catch (e) {
        console.log("error retrieving token");
        // error reading value
      }
    };
    getData();
  }, [key]);

  return value;
};

export default getAsyncData;
