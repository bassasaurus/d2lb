import React, { useEffect, useRef } from 'react';
import { AccessibilityInfo, Animated, Image, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import Svg, { Path } from 'react-native-svg';

const MARK_SIZE = 152;
const STARTUP_MARK_SIZE = MARK_SIZE * 3;
const WORDMARK_TOP = 35;
const LOGO_WIDTH = 334;
const LOGO_HEIGHT = 77;

export default function StartupArtwork({ colors, onNameVisible }) {
  const progress = useRef(new Animated.Value(0)).current;
  const markScale = progress.interpolate({
    inputRange: [0, 1],
    outputRange: [1, MARK_SIZE / STARTUP_MARK_SIZE],
  });
  const nameOffset = progress.interpolate({
    inputRange: [0, 1],
    outputRange: [56, 0],
  });
  const { width } = useWindowDimensions();
  const wordmarkWidth = Math.min(LOGO_WIDTH, Math.max(120, width - 64));
  const scale = wordmarkWidth / LOGO_WIDTH;

  useEffect(() => {
    if (!onNameVisible) return;
    let active = true;
    let animation;
    const reveal = reduceMotion => {
      if (!active) return;
      if (reduceMotion) {
        progress.setValue(1);
        onNameVisible();
        return;
      }
      animation = Animated.timing(progress, {
        toValue: 1,
        delay: 150,
        duration: 400,
        useNativeDriver: true,
      });
      animation.start(({ finished }) => {
        if (active && finished) onNameVisible();
      });
    };
    AccessibilityInfo.isReduceMotionEnabled().then(reveal, () => reveal(false));
    return () => {
      active = false;
      animation?.stop();
    };
  }, [onNameVisible, progress]);

  return <View accessible accessibilityRole="progressbar"
    accessibilityLabel="Direct2Logbook. Opening your logbook."
    style={styles.mark}>
    <Animated.View accessible={false} style={[styles.animatedMark, { transform: [{ scale: markScale }] }]}>
      <Svg width={STARTUP_MARK_SIZE} height={STARTUP_MARK_SIZE} viewBox="-136 -140 784 784">
        <Path
          fill={colors.text}
          d="M61 230 L232 297 C276 314 322 282 322 235 C322 197 291 166 253 166
            C246 166 246 155 253 155 C297 155 333 191 333 235
            C333 290 278 327 228 307 L61 242 Z
            M61 252 L225 316 C282 338 343 296 343 235 C343 186 303 146 254 146
            C240 146 226 149 215 155 C209 158 204 148 210 145
            C224 138 238 135 254 135 C309 135 354 180 354 235
            C354 304 285 350 221 326 L61 264 Z
            M61 274 L217 335 C287 362 364 310 364 235 C364 174 315 125 254 125
            C247 125 247 114 254 114 C321 114 375 168 375 235
            C375 265 364 293 344 315 L451 273 L451 285
            L291 348 C265 358 239 356 213 346 L61 286 Z
            M61 296 L256 373 L451 296 L451 308 L274 378
            C282 379 281 390 273 390 L239 390 C231 390 230 379 238 378
            L61 308 Z"
        />
      </Svg>
    </Animated.View>
    {onNameVisible && <Animated.View style={[styles.name, { opacity: progress, transform: [{ translateY: nameOffset }] }]}>
      <View style={{ width: wordmarkWidth, height: (LOGO_HEIGHT - WORDMARK_TOP) * scale, overflow: 'hidden' }}>
        <Image source={require('../assets/D2LB_LOGO_Dark_top.png')}
          resizeMode="contain" accessible={false}
          style={{ width: wordmarkWidth, height: LOGO_HEIGHT * scale,
            marginTop: -WORDMARK_TOP * scale, tintColor: colors.text }} />
      </View>
      <Text style={[styles.label, { color: colors.muted }]}>Opening your logbook…</Text>
    </Animated.View>}
  </View>;
}

const styles = StyleSheet.create({
  mark: { width: MARK_SIZE, height: MARK_SIZE },
  animatedMark: {
    position: 'absolute',
    top: (MARK_SIZE - STARTUP_MARK_SIZE) / 2,
    left: (MARK_SIZE - STARTUP_MARK_SIZE) / 2,
  },
  name: { position: 'absolute', top: MARK_SIZE * 0.75, alignSelf: 'center', alignItems: 'center' },
  label: { marginTop: 12, fontSize: 14 },
});
