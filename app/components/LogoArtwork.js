import React from 'react';
import { Image, Text, View, useWindowDimensions } from 'react-native';

// Does not require a loaded theme, so it can also render during theme startup.
export default function LogoArtwork({ color, mutedColor, label = 'Loading…' }) {
  const { width } = useWindowDimensions();
  const logoWidth = Math.min(334, Math.max(120, width - 64));
  return <View accessible accessibilityRole="progressbar" accessibilityLabel={`Direct2Logbook. ${label}`}
    style={{ alignItems: 'center', paddingHorizontal: 24 }}>
    <Image source={require('../assets/D2LB_LOGO_Dark_top.png')} resizeMode="contain" accessible={false}
      style={{ width: logoWidth, height: logoWidth * 77 / 334, tintColor: color }} />
    {label ? <Text style={{ marginTop: 20, color: mutedColor, fontSize: 14 }}>{label}</Text> : null}
  </View>;
}
