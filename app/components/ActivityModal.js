import React from "react";
import { View, StyleSheet, Modal, ActivityIndicator } from "react-native";
import { STYLES } from "../styles/styles";

function ActivityModal({ visible }) {
  console.log(visible);
  return (
    <Modal visible={visible} transparent={true}>
      <View style={styles.centeredView}>
        <View style={styles.modalView}>
          <ActivityIndicator
            size='large'
            color={STYLES.blue}
          ></ActivityIndicator>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalView: {
    margin: 20,
    backgroundColor: "white",
    borderRadius: 20,
    padding: 35,

    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
  },
  centeredView: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    marginTop: 22,
  },
});

export default ActivityModal;
