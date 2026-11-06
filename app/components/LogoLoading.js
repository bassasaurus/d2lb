import React from 'react';
import { useAppTheme } from '../theme/ThemeProvider';
import LogoArtwork from './LogoArtwork';

export default function LogoLoading({ label = 'Loading…' }) {
  const { colors } = useAppTheme();
  return <LogoArtwork color={colors.text} mutedColor={colors.muted} label={label} />;
}
