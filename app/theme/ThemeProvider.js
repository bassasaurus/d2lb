import LogoArtwork from '../components/LogoArtwork';
import React, { createContext, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { Appearance, useColorScheme, View } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as SystemUI from 'expo-system-ui';
import { DarkTheme, DefaultTheme } from '@react-navigation/native';
import { PALETTES, effectiveScheme } from './palettes.mjs';
import { createPreferenceStore } from './preferenceStore.mjs';
import { STYLES as baseStyles } from '../styles/styles';

const ThemeContext = createContext(null);
export function ThemeProvider({ children }) {
  const systemScheme = useColorScheme();
  const storage = useRef(createPreferenceStore(AsyncStorage));
  const [preference, setPreference] = useState('system');
  const [ready, setReady] = useState(false);
  const [writes, setWrites] = useState(0);
  const scheme = effectiveScheme(preference, systemScheme);
  useEffect(() => {
    let active = true;
    storage.current.load().then(value => { if (active) setPreference(value); }).catch(() => {})
      .finally(() => { if (active) setReady(true); });
    return () => { active = false; };
  }, []);
  useEffect(() => {
    if (ready) Appearance.setColorScheme(preference === 'system' ? 'auto' : preference);
  }, [preference, ready]);
  useEffect(() => {
    SystemUI.setBackgroundColorAsync(PALETTES[scheme].background).catch(() => {});
  }, [scheme]);
  const value = useMemo(() => {
    const colors = PALETTES[scheme];
    const navigationBase = scheme === 'dark' ? DarkTheme : DefaultTheme;
    return {
      preference, scheme, isDark: scheme === 'dark', colors, saving: writes > 0,
      styles: { ...baseStyles, ...colors, blue: colors.primary, black: colors.text,
        white: colors.surface, grey: colors.border, red: colors.danger, green: colors.actionGreen,
        lightblue: colors.selected, itemBackground: colors.background, elementBackground: colors.surface,
        inputBorderColor: colors.border },
      navigationTheme: { ...navigationBase, colors: { ...navigationBase.colors,
        primary: colors.primary, background: colors.background, card: colors.surface,
        text: colors.text, border: colors.border, notification: colors.danger } },
      async setPreference(next) {
        setWrites(count => count + 1);
        try { setPreference(await storage.current.save(next)); }
        finally { setWrites(count => count - 1); }
      },
    };
  }, [scheme, preference, writes]);
  if (!ready) return <View style={{ flex: 1, backgroundColor: PALETTES[scheme].background, alignItems: 'center', justifyContent: 'center' }}>
    <LogoArtwork color={PALETTES[scheme].text} mutedColor={PALETTES[scheme].muted} label="Opening your logbook…" />
  </View>;
  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}
export function useAppTheme() {
  const value = useContext(ThemeContext);
  if (!value) throw new Error('App theme must be used inside ThemeProvider.');
  return value;
}
