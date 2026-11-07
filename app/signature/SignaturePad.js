import React, { useRef, useState } from 'react';
import { Image, View } from 'react-native';
import Svg, { Circle, Polyline } from 'react-native-svg';
import Text from '../components/AppText';

// Normalized points make capture independent of screen size and future document use.
export default function SignaturePad({ strokes, onChange, disabled = false, style, signature, onBegin }) {
  const size = useRef({ width: 1, height: 1 });
  const current = useRef(null);
  const [drawing, setDrawing] = useState([]);
  const point = event => [Math.max(0, Math.min(1, event.nativeEvent.locationX / size.current.width)),
    Math.max(0, Math.min(1, event.nativeEvent.locationY / size.current.height))];
  const finish = () => {
    if (current.current?.length) onChange([...strokes, current.current]);
    current.current = null;
    setDrawing([]);
  };
  const visible = [...strokes, ...(drawing.length ? [drawing] : [])];
  return <View accessible accessibilityLabel="Signature drawing area. Draw with your finger."
    onLayout={event => { size.current = event.nativeEvent.layout; }}
    onStartShouldSetResponder={() => !disabled}
    onMoveShouldSetResponder={() => !disabled}
    onResponderTerminationRequest={() => false}
    onResponderGrant={event => { onBegin?.(); current.current = [point(event)]; setDrawing(current.current); }}
    onResponderMove={event => {
      if (!current.current || current.current.length >= 4000) return;
      current.current = [...current.current, point(event)];
      setDrawing(current.current);
    }} onResponderRelease={finish} onResponderTerminate={finish}
    style={[{ width: '100%', aspectRatio: 3, backgroundColor: '#fff', borderRadius: 10, overflow: 'hidden' }, style]}>
    {signature && !visible.length && <Image pointerEvents="none" source={{ uri: signature }} resizeMode="contain"
      accessibilityLabel="Current signature" style={{ position: 'absolute', left: 0, right: 0, top: 0, bottom: 0 }} />}
    <Svg pointerEvents="none" width="100%" height="100%" viewBox="0 0 900 300" preserveAspectRatio="none">
      {visible.map((stroke, index) => stroke.length === 1
        ? <Circle key={index} cx={stroke[0][0] * 900} cy={stroke[0][1] * 300} r={2} fill="black" />
        : <Polyline key={index} points={stroke.map(([x, y]) => `${x * 900},${y * 300}`).join(' ')} fill="none"
          stroke="black" strokeWidth={3.5} strokeLinecap="round" strokeLinejoin="round" />)}
    </Svg>
    {!visible.length && !signature && <View pointerEvents="none" style={{ position: 'absolute', left: 0, right: 0, top: '45%', alignItems: 'center' }}>
      <Text color="#666">Sign here</Text>
    </View>}
  </View>;
}
