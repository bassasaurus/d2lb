import { useMemo } from 'react';
import React, { useContext } from "react";
import { View, StyleSheet, Modal, ActivityIndicator } from "react-native";
import { useAppTheme } from '../theme/ThemeProvider';
import AppContext from "./AppContext";

function ActivityModal(props) {
  const { styles: STYLES } = useAppTheme();
  const styles = useMemo(() => createStyles(STYLES), [STYLES]);
  const Context = useContext(AppContext);
  return (
    <Modal visible={Context.activityVisibleValue} transparent={true}>
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

const createStyles = STYLES => StyleSheet.create({
  modalView: {
    margin: 20,
    backgroundColor: STYLES.surface,
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
