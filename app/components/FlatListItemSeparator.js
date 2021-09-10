import React from "react";
import { View, StyleSheet } from "react-native";
import { STYLES } from "../styles/styles";

function FlatListItemSeparator(props) {
  return (
    <View
      style={{
        height: 1,
        width: "100%",
        backgroundColor: STYLES.grey,
      }}
    />
  );
}

const styles = StyleSheet.create({
  container: {},
});

export default FlatListItemSeparator;
