import React from "react";
import { View, StyleSheet, TouchableWithoutFeedback, Text } from "react-native";

function AppButton({ title, onPress }) {
  return (
    <TouchableWithoutFeedback onPress={onPress}>
      <View style={styles.container}>
        <Text>{title}</Text>
      </View>
    </TouchableWithoutFeedback>
  );
}

const styles = StyleSheet.create({
  container: {},
});

export default AppButton;
