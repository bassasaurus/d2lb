import { useMemo } from 'react';
import React from "react";
import { View, StyleSheet } from "react-native";
import { useAppTheme } from '../theme/ThemeProvider';

function FlatListItemSeparator(props) {
  const { styles: STYLES } = useAppTheme();
  const styles = useMemo(() => createStyles(STYLES), [STYLES]);
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

const createStyles = STYLES => StyleSheet.create({
  container: {},
});

export default FlatListItemSeparator;
