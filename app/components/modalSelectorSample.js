import React, { useState } from "react";
import { View, StyleSheet, TextInput, Switch } from "react-native";

import ModalSelector from "react-native-modal-selector";

function ModalSelectorSample(props) {
  const [textInputValue, setTextInputValue] = useState("");

  const data = [
    { key: 1, section: true, label: "Fruits" },
    { key: 2, label: "Red Apples" },
    { key: 3, label: "Cherries" },
    {
      key: 4,
      label: "Cranberries",
      accessibilityLabel: "Tap here for cranberries",
    },
    // etc...
    // Can also add additional custom keys which are passed to the onChange callback
    { key: 5, label: "Vegetable", customKey: "Not a fruit" },
  ];

  return (
    <View style={{ flex: 1, justifyContent: "space-around", padding: 50 }}>
      <ModalSelector
        data={data}
        initValue='Select something yummy!'
        supportedOrientations={["landscape"]}
        accessible={true}
        scrollViewAccessibilityLabel={"Scrollable options"}
        cancelButtonAccessibilityLabel={"Cancel Button"}
        onChange={(option) => {
          setTextInputValue({ textInputValue: option.label });
        }}
      >
        <TextInput
          style={{
            borderWidth: 1,
            borderColor: "#ccc",
            padding: 10,
            height: 30,
          }}
          editable={false}
          placeholder='Select something yummy!'
          value={textInputValue}
        />
      </ModalSelector>
    </View>
  );
}
const styles = StyleSheet.create({
  container: {},
});

export default ModalSelectorSample;
