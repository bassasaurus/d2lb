import { approachLabel, approachOptions } from '../forms/approachChoices.mjs';
import { FlatList } from './OverflowLists';
import { useMemo } from 'react';
import React, { useState } from "react";
import { View, StyleSheet, Modal, Pressable, TouchableOpacity } from 'react-native';
import Text from './AppText';
import PlatformActionButton from './PlatformActionButton';

import AppTextInput from "./AppTextInput";

import { useAppTheme } from '../theme/ThemeProvider';
import FlatListItemSeparator from "./FlatListItemSeparator";

function ApproachPicker({
  setFieldValue,
  approachKey,
  approachValue,
  numberKey,
  numberValue,
}) {
  const { styles: STYLES } = useAppTheme();
  const styles = useMemo(() => createStyles(STYLES), [STYLES]);
  const [visible, setVisible] = useState(false);
  const [data, setData] = useState("");

  const fetchData = () => {
    setData(approachOptions(approachValue));
  };

  const renderItem = ({ item }) => (
    <View style={styles.container}>
      <TouchableOpacity
        onPress={() => {
          setVisible(false);
          setFieldValue(approachKey, item.value);
        }}
      >
        <Text style={styles.listItem}>{item.label}</Text>
      </TouchableOpacity>
    </View>
  );

  return (
    <>
      <View style={{ flexDirection: "row", flex: 1, minWidth: 0 }}>
        <View style={{ paddingRight: 8, flex: 1, minWidth: 0 }}>
          <Pressable
            onPress={() => {
              fetchData();
              setVisible(true);
            }}
          >
            <View pointerEvents={"none"}>
              <AppTextInput
                isValid={true}
                value={approachLabel(approachValue)}
                placeholder={"Approach Type"}
              ></AppTextInput>
            </View>
          </Pressable>
        </View>

        <View style={{ width: 52 }}><AppTextInput
          isValid={true}
          placeholder='#'
          keyboardType='numeric'
          clearButtonMode={"always"}
          value={String(numberValue ?? '')}
          onChangeText={(val) => setFieldValue(numberKey, val)}
        ></AppTextInput></View>

        <View style={{ flexDirection: "row" }}>
          <View
            style={{
              flexDirection: "row",
              alignItems: "flex-end",
            }}
          ></View>
        </View>
      </View>
      <View style={styles.centeredView}>
        <Modal animationType='slide' transparent={true} visible={visible} onRequestClose={() => setVisible(false)}>
          <View style={styles.modalView}>
            <PlatformActionButton variant="text" title="Cancel" onPress={() => setVisible(false)} />
            <FlatList
              data={data}
              renderItem={renderItem}
              keyExtractor={(item) => item.id.toString()}
              ItemSeparatorComponent={FlatListItemSeparator}
            />
          </View>
        </Modal>
      </View>
    </>
  );
}

const createStyles = STYLES => StyleSheet.create({
  container: {},

  modalView: {
    margin: 20,
    backgroundColor: STYLES.surface,
    borderRadius: 20,
    padding: 35,
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: {
      width: 2,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
  },
  listItem: {
    fontFamily: STYLES.font,
    fontSize: 20,
    color: STYLES.blue,
    marginTop: 20,
  },

  centeredView: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    marginTop: 0,
  },
});

export default ApproachPicker;
