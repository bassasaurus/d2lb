import { useMemo } from 'react';
import React from "react";
import { View, StyleSheet, TextInput, Platform } from "react-native";
import { useAppTheme } from '../theme/ThemeProvider';

function AppTextInput({ title, placeholder, isValid, onBlur, style, ...props }) {
  const { styles: STYLES, isDark } = useAppTheme();
  const styles = useMemo(() => createStyles(STYLES), [STYLES]);
  return (
    <View>
      <TextInput
        style={[styles.input, style, String(props.value ?? props.defaultValue ?? '').length === 0 && { textAlign: 'left' }]}
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
    height: Platform.OS === 'android' ? undefined : 40,
    minHeight: 40,
    paddingVertical: Platform.OS === 'android' ? 8 : undefined,
    textAlignVertical: Platform.OS === 'android' ? 'center' : undefined,
    marginTop: 10,
    borderWidth: 1,
    borderRadius: STYLES.borderRadius,
  },
});

export default AppTextInput;
