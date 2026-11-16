import React, { useRef, useState } from 'react';
import { Image, PanResponder, View, useWindowDimensions } from 'react-native';
import Svg, { Polygon } from 'react-native-svg';
import Text from '../components/AppText';
import PlatformActionButton from '../components/PlatformActionButton';
import { useAppTheme } from '../theme/ThemeProvider';
import { DEFAULT_CROP_CORNERS, validCropCorners } from './cropQuad.mjs';

function Corner({ point, width, height, index, move }) {
  const origin = useRef(point);
  const latest = useRef({ point, width, height, move }); latest.current = { point, width, height, move };
  const responder = useRef(PanResponder.create({
    onStartShouldSetPanResponder: () => true,
    onMoveShouldSetPanResponder: () => true,
    onPanResponderGrant: () => { origin.current = latest.current.point; },
    onPanResponderMove: (_, gesture) => latest.current.move(index, [
      Math.max(0, Math.min(1, origin.current[0] + gesture.dx / latest.current.width)),
      Math.max(0, Math.min(1, origin.current[1] + gesture.dy / latest.current.height)),
    ]),
  })).current;
  return <View {...responder.panHandlers} accessible accessibilityLabel={`Crop corner ${index + 1}`}
    style={{ position: 'absolute', left: point[0] * width - 22, top: point[1] * height - 22, width: 44, height: 44, alignItems: 'center', justifyContent: 'center' }}>
    <View style={{ width: 18, height: 18, borderRadius: 9, backgroundColor: '#fff', borderWidth: 3, borderColor: '#2463eb' }} />
  </View>;
}
export default function RegistrationPhotoAdjustment({ photo, onScan, onCancel }) {
  const { colors } = useAppTheme(); const window = useWindowDimensions();
  const [width, setWidth] = useState(0);
  const [corners, setCorners] = useState(DEFAULT_CROP_CORNERS);
  const imageRatio = (photo.width || 3) / (photo.height || 1);
  const displayWidth = Math.min(width, window.height * 0.42 * imageRatio);
  const displayHeight = displayWidth / imageRatio;
  function move(index, value) { setCorners(old => old.map((point, i) => i === index ? value : point)); }
  return <>
    <Text weight="600" style={{ color: colors.text, fontSize: 21 }}>Adjust Photo</Text>
    <Text style={{ color: colors.muted, marginVertical: 10 }}>Place the corners around the registration, leaving space at the edges.</Text>
    <View onLayout={event => setWidth(event.nativeEvent.layout.width)} style={{ alignItems: 'center', paddingVertical: 22 }}>
      {width > 0 && <View style={{ width: displayWidth, height: displayHeight }}>
        <Image source={{ uri: photo.uri }} resizeMode="stretch" style={{ width: displayWidth, height: displayHeight }} />
        <Svg pointerEvents="none" width={displayWidth} height={displayHeight} style={{ position: 'absolute' }}>
          <Polygon points={corners.map(p => `${p[0] * displayWidth},${p[1] * displayHeight}`).join(' ')} fill="#2463eb22" stroke="#fff" strokeWidth={2} />
        </Svg>
        {corners.map((point, index) => <Corner key={index} {...{ point, index, move }} width={displayWidth} height={displayHeight} />)}
      </View>}
    </View>
    <PlatformActionButton title="Read Registration" disabled={!validCropCorners(corners)} onPress={() => onScan(corners)} />
    <PlatformActionButton title="Cancel" variant="text" onPress={onCancel} />
  </>;
}
