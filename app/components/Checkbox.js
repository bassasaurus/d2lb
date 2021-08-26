import React, { useState } from "react";
import { View, StyleSheet, Pressable } from "react-native";
import { STYLES } from "../styles/styles";

function Checkbox({ onPress }) {
  const [checked, setChecked] = useState(false);
  const toggleFunction = () => {
    setChecked(!checked);
  };
  return (
    <View style={styles.container}>
      <Pressable
        onPress={() => {
          setChecked(true);
          toggleFunction();
        }}
      >
        <View
          style={{
            height: 20,
            width: 20,
            backgroundColor: checked === true ? "blue" : "yellow",
          }}
        ></View>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {},
  checkbox: {},
});

export default Checkbox;
