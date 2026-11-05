import { useMemo } from 'react';
import React from "react";
import { View, StyleSheet, TextInput } from "react-native";
import { useAppTheme } from '../theme/ThemeProvider';

function AppTextInput({ title, placeholder, isValid, onBlur, style, ...props }) {
  const { styles: STYLES, isDark } = useAppTheme();
  const styles = useMemo(() => createStyles(STYLES), [STYLES]);
  return (
    <View>
      <TextInput
        style={[styles.input, style]}
        placeholderTextColor={STYLES.placeholder}
        selectionColor={STYLES.blue}
        keyboardAppearance={isDark ? 'dark' : 'light'}
        title={title}
        placeholder={placeholder}
        borderColor={!isValid ? STYLES.red : STYLES.grey}
        onBlur={onBlur}
        {...props}
      ></TextInput>
    </View>
  );
}

const createStyles = STYLES => StyleSheet.create({
  input: {
    color: STYLES.black,
    backgroundColor: STYLES.surface,
    paddingRight: 10,
    paddingLeft: 10,
    height: 40,
    marginTop: 10,
    borderWidth: 1,
    borderRadius: STYLES.borderRadius,
  },
});

export default AppTextInput;
