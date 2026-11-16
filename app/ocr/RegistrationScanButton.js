import { KeyboardAvoidingView } from '../components/keyboardController';
import { ScrollView } from 'react-native';
import RegistrationPhotoAdjustment from './RegistrationPhotoAdjustment';
import RegistrationCamera from './RegistrationCamera';
import React, { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Keyboard, Linking, Modal, Pressable, View } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import Text from '../components/AppText';
import AppTextInput from '../components/AppTextInput';
import PlatformActionButton from '../components/PlatformActionButton';
import { useAppTheme } from '../theme/ThemeProvider';
import { captureRegistration, cameraOcrAvailable, removeRegistrationPhoto, rescanRegistration } from './captureRegistration';
import { normalizeRegistration, scannedTailnumber, registrationReview } from './registrationCandidates.mjs';

export default function RegistrationScanButton({ aircraft, tailnumbers, beforeCapture, onConfirm, onBusyChange, onOpen }) {
  const { colors } = useAppTheme();
  const [busy, setBusy] = useState(false);
  const [recognizing, setRecognizing] = useState(false);
  const [cameraRequest, setCameraRequest] = useState(null);
  const pendingCamera = useRef(null);
  const [review, setReview] = useState(null);
  const [adjusting, setAdjusting] = useState(false);
  useEffect(() => { const photo = review?.photo; return () => removeRegistrationPhoto(photo); }, [review?.photo?.uri]);
  const [registration, setRegistration] = useState('');
  const [message, setMessage] = useState(null);
  const [settings, setSettings] = useState(false);
  const running = useRef(false);
  const mounted = useRef(true);
  useEffect(() => { mounted.current = true; return () => { mounted.current = false; pendingCamera.current?.resolve({ canceled: true }); pendingCamera.current = null; }; }, []);
  const match = scannedTailnumber(tailnumbers, registration, aircraft);
  const valid = /^[A-Z0-9]+(?:-[A-Z0-9]+)?$/.test(registration) && registration.length >= 3 && registration.length <= 8;
  function finishCapture(request, photo, error) {
    if (pendingCamera.current !== request) return;
    pendingCamera.current = null;
    setCameraRequest(null);
    if (error) request.reject(new Error('Camera could not capture an image.'));
    else if (photo) {
      setRecognizing(true);
      request.resolve({ assets: [photo] });
    } else request.resolve({ canceled: true });
  }
  const close = () => {
    if (pendingCamera.current) finishCapture(pendingCamera.current);
    else if (!running.current) { if (adjusting) setAdjusting(false); else { setReview(null); setMessage(null); } }
  };
  async function scan() {
    if (running.current) return;
    Keyboard.dismiss();
    onOpen?.();
    setMessage(null); setSettings(false);
    running.current = true; setBusy(true); onBusyChange?.(true);
    try {
      const result = await captureRegistration({ aircraft, beforeCapture,
        takePhoto: () => new Promise((resolve, reject) => {
          if (!mounted.current) { resolve({ canceled: true }); return; }
          const request = { resolve, reject };
          pendingCamera.current = request;
          setCameraRequest(request);
        }),
        onRecognizing: () => { if (mounted.current) setRecognizing(true); },
      });
      if (!mounted.current) { removeRegistrationPhoto(result.photo); return; }
      if (result.kind === 'unavailable') setMessage('Camera scanning needs an app update. Enter manually.');
      if (result.kind === 'permission') {
        setMessage('Allow camera access or enter manually.');
        setSettings(!result.canAskAgain);
      }
      if (result.kind === 'review') {
        setReview(result);
        setRegistration(registrationReview(result.candidates));
      }
    } catch (error) {
      if (mounted.current) setMessage(error.code === 'DRAFT_SAVE_FAILED'
        ? 'Couldn’t save draft. Keep this form open and retry.'
        : 'Couldn’t read registration. Retake or enter manually.');
    } finally {
      running.current = false;
      if (mounted.current) { setRecognizing(false); setBusy(false); onBusyChange?.(false); }
    }
  }
  async function readAdjusted(corners) {
    if (running.current || !review?.photo) return;
    running.current = true; setBusy(true); setRecognizing(true); onBusyChange?.(true); setMessage(null);
    try {
      const result = await rescanRegistration(review.photo, corners, aircraft);
      if (mounted.current) { setReview(result); setRegistration(registrationReview(result.candidates)); }
    } catch {
      if (mounted.current) setMessage('Couldn’t read crop. Adjust or enter manually.');
    } finally {
      running.current = false;
      if (mounted.current) { setAdjusting(false); setBusy(false); setRecognizing(false); onBusyChange?.(false); }
    }
  }
  async function confirm() {
    if (!valid || running.current || match.kind === 'other-aircraft') return;
    running.current = true; setBusy(true); onBusyChange?.(true); setMessage(null);
    try {
      await onConfirm(registration);
      if (mounted.current) setReview(null);
    } catch {
      if (mounted.current) setMessage('Couldn’t select this tailnumber. Check the registration and try again.');
    } finally {
      running.current = false;
      if (mounted.current) { setRecognizing(false); setBusy(false); onBusyChange?.(false); }
    }
  }
  return <>
    <Pressable testID="tailnumber-camera" accessibilityRole="button" accessibilityLabel="Scan tailnumber with camera"
      accessibilityState={{ disabled: busy }} disabled={busy} onPress={scan} hitSlop={4}
      style={{ minWidth: 44, minHeight: 44, alignItems: 'center', justifyContent: 'center' }}>
      {busy ? <ActivityIndicator color={colors.primary} /> : <MaterialCommunityIcons name="camera-outline" size={25} color={colors.primary} />}
    </Pressable>
    {!review && message && <Text accessibilityLiveRegion="polite" style={{ color: colors.danger, flexBasis: '100%', marginTop: 6 }}>{message}</Text>}
    {!review && settings && <PlatformActionButton title="Open Settings" variant="text" onPress={() => Linking.openSettings().catch(() => {})} />}
    <Modal visible={Boolean(cameraRequest) || recognizing || Boolean(review)} transparent animationType="fade" onRequestClose={close}>
      <KeyboardAvoidingView behavior="padding" style={{ flex: 1, justifyContent: 'center', padding: 20, backgroundColor: '#00000088' }}>
        <View accessibilityViewIsModal style={{ backgroundColor: colors.surface, borderRadius: 12, padding: 18, maxHeight: '90%' }}>
          {cameraRequest ? <RegistrationCamera onCapture={photo => finishCapture(cameraRequest, photo)}
            onCancel={() => finishCapture(cameraRequest)} onError={() => finishCapture(cameraRequest, null, true)} />
            : recognizing ? <View accessibilityLiveRegion="polite" style={{ alignItems: 'center', paddingVertical: 20 }}>
            <ActivityIndicator size="large" color={colors.primary} />
            <Text weight="600" style={{ color: colors.text, fontSize: 20, marginTop: 16 }}>Reading registration…</Text>
          </View> : adjusting && review?.photo ? <RegistrationPhotoAdjustment photo={review.photo} onScan={readAdjusted} onCancel={() => setAdjusting(false)} /> : <ScrollView style={{ flexGrow: 0 }} contentContainerStyle={{ paddingBottom: 12 }} keyboardShouldPersistTaps="handled">
            <Text weight="600" style={{ fontSize: 21, color: colors.text }}>Verify Registration</Text>
            <Text style={{ color: review?.needsVerification || review?.lowConfidence ? colors.warning : colors.muted, marginTop: 10 }}>{review?.candidates.length > 1 ? 'Multiple readings. Retake or enter manually.' : review?.needsVerification ? 'Possible reading—check corrected digits.' : review?.lowConfidence && review?.candidates.length ? 'Possible reading—check each character.' : review?.candidates.length ? 'Check the registration.' : review?.recognizedLines?.length ? 'No registration found. Enter it below.' : 'No text found. Retake or enter manually.'}</Text>
            <AppTextInput testID="scan-registration-review" accessibilityLabel="Scanned registration" placeholder="Registration"
              value={registration} onChangeText={text => { setRegistration(normalizeRegistration(text)); setMessage(null); }}
              editable={!busy} autoCapitalize="characters" autoCorrect={false} maxLength={8} isValid={valid} />
            {registration.length > 0 && !valid && <Text style={{ color: colors.danger, marginTop: 8 }}>Use 3–8 letters, numbers or a hyphen.</Text>}
            {valid && <Text accessibilityLiveRegion="polite" style={{ marginTop: 10, color: match.kind === 'other-aircraft' ? colors.danger : colors.text }}>
              {match.kind === 'existing' ? `Saved tailnumber for ${aircraft}.` : match.kind === 'other-aircraft'
                ? `${match.item.registration} is assigned to ${match.item.aircraft}. Choose a tailnumber for ${aircraft}.`
                : `${registration} isn’t in your logbook. Add it as a new tailnumber.`}
            </Text>}
            {message && <Text accessibilityLiveRegion="polite" style={{ color: colors.danger, marginTop: 10 }}>{message}</Text>}
            <PlatformActionButton testID="scan-registration-confirm" title={match.kind === 'new' ? 'Add Tailnumber' : 'Use Tailnumber'}
              onPress={confirm} disabled={!valid || busy || match.kind === 'other-aircraft'} style={{ marginTop: 16 }} />
            {review?.photo && <PlatformActionButton title="Adjust Photo" variant="text" disabled={busy} onPress={() => { setMessage(null); setAdjusting(true); }} />}
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 6 }}>
              <PlatformActionButton title="Retake" variant="text" disabled={busy || !cameraOcrAvailable} onPress={() => { setReview(null); setTimeout(() => { if (mounted.current) scan(); }, 350); }} />
              <PlatformActionButton title="Cancel" variant="text" disabled={busy} onPress={close} />
            </View>
          </ScrollView>}
        </View>
      </KeyboardAvoidingView>
    </Modal>
  </>;
}
