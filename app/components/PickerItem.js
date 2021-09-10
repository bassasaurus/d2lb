import React from "react";
import { View, StyleSheet, Text } from "react-native";

function PickerItem(aircraftName) {
  return (
    <View style={styles.container}>
      <Text>{aircraftName}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {},
});

export default PickerItem;
