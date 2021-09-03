import React, { useState, useEffect } from "react";
import { View, StyleSheet, Text, Pressable } from "react-native";
import AddFormButton from "./AddFormButton";

function FormTest(props) {
  const [count, setCount] = useState(1);

  const limitCount = (count) => {
    if (count <= 0) {
      return 1;
    }
    if (count > 2) {
      return 3;
    }
    if (count < 3) {
      return count;
    }
  };

  console.log(count);

  return [...Array(count)].map((e, i) => (
    <View style={styles.container} key={i}>
      <View style={{ flexDirection: "row" }}>
        <Text>Form Component</Text>
        <AddFormButton
          buttonSize={40}
          buttonColor='green'
          iconName='plus'
          onPress={() => {
            setCount(limitCount(count + 1));
          }}
        ></AddFormButton>

        <AddFormButton
          buttonSize={40}
          buttonColor='red'
          iconName='minus'
          onPress={() => {
            setCount(limitCount(count - 1));
          }}
        ></AddFormButton>
      </View>
    </View>
  ));
}

const styles = StyleSheet.create({
  container: {},
});

export default FormTest;
