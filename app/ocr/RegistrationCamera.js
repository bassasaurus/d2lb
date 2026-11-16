import { REGISTRATION_GUIDE } from './guideCrop.mjs';
import { captureCameraPhoto } from './cameraPhoto.mjs';
import React, { useRef, useState } from 'react';
import { ActivityIndicator, useWindowDimensions, View } from 'react-native';
import Text from '../components/AppText';
import PlatformActionButton from '../components/PlatformActionButton';
import { useAppTheme } from '../theme/ThemeProvider';

export default function RegistrationCamera({ onCapture, onCancel, onError }) {
  const { colors } = useAppTheme();
  const { height } = useWindowDimensions();
  const camera = useRef(null);
  const taking = useRef(false);
  const [ready, setReady] = useState(false);
  const [busy, setBusy] = useState(false);
  const [preview, setPreview] = useState(null);
  // Only rendered after the native-module availability and permission checks.
  const { CameraView } = require('expo-camera');
  async function capture() {
    if (!ready || !preview?.width || !preview?.height || taking.current || !camera.current) return;
    taking.current = true; setBusy(true);
    try {
      const photo = await captureCameraPhoto(camera.current);
      onCapture({ ...photo, preview: { width: preview.width, height: preview.height } });
    } catch { onError(); }
    finally { taking.current = false; setBusy(false); }
  }
  return <>
    <Text weight="600" style={{ fontSize: 21, color: colors.text }}>Scan Tailnumber</Text>
    <Text style={{ color: colors.muted, marginTop: 8, marginBottom: 12 }}>Keep the registration inside the box. Avoid glare.</Text>
    <View onLayout={event => setPreview(event.nativeEvent.layout)} style={{ height: Math.min(420, height * 0.48), borderRadius: 8, overflow: 'hidden', backgroundColor: '#000' }}>
      <CameraView ref={camera} style={{ flex: 1 }} facing="back" mode="picture" autofocus="on"
        onCameraReady={() => setReady(true)} onMountError={onError} />
      <View pointerEvents="none" style={{ position: 'absolute', top: `${REGISTRATION_GUIDE.y * 100}%`, left: `${REGISTRATION_GUIDE.x * 100}%`, width: `${REGISTRATION_GUIDE.width * 100}%`, height: `${REGISTRATION_GUIDE.height * 100}%`, borderWidth: 2, borderColor: '#fff', borderRadius: 8 }} />
      {!ready && <View pointerEvents="none" style={{ position: 'absolute', top: '45%', alignSelf: 'center' }}><ActivityIndicator color="#fff" /></View>}
    </View>
    <PlatformActionButton testID="tailnumber-capture" title={busy ? 'Capturing…' : 'Capture'} icon="camera"
      disabled={!ready || !preview?.width || !preview?.height || busy} onPress={capture} style={{ marginTop: 14 }} />
    <PlatformActionButton title="Cancel" variant="text" disabled={busy} onPress={onCancel} />
  </>;
}
