import React from "react";
import { View, StyleSheet, Button } from "react-native";

function AppButton({ title, onPress }) {
  return (
    <View style={styles.container}>
      <Button title={title} style={styles.text} onPress={onPress} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: 100,
  },
});

export default AppButton;
