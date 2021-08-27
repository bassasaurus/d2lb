import React, { useState } from "react";
import { View, StyleSheet, Pressable } from "react-native";
import { STYLES } from "../styles/styles";

function Checkbox({ onPress, isChecked }) {
  const [checked, setChecked] = useState(false);

  const toggle = () => {
    setChecked(!checked);
  };

  return (
    <View style={styles.container}>
      <Pressable
        onPress={() => {
          {
            onPress();
          }
          setChecked(true);
          toggle();
        }}
      >
        <View
          style={{
            height: 20,
            width: 20,
            backgroundColor: isChecked === true ? STYLES.blue : STYLES.white,
            borderColor: STYLES.grey,
            borderWidth: 1,
            marginRight: 3,
            borderRadius: STYLES.borderRadius,
          }}
        ></View>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {},
});

export default Checkbox;
