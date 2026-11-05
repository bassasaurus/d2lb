import React from "react";
import { View, StyleSheet } from 'react-native';
import Text from './AppText';

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
