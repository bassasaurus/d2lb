import { useMemo } from 'react';
import React, { useState } from "react";
import { View, StyleSheet, Pressable } from "react-native";
import { useAppTheme } from '../theme/ThemeProvider';

function Checkbox({ onPress, isChecked }) {
  const { styles: STYLES } = useAppTheme();
  const styles = useMemo(() => createStyles(STYLES), [STYLES]);
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

const createStyles = STYLES => StyleSheet.create({
  container: {},
});

export default Checkbox;
