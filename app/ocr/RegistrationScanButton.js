import React, { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Keyboard, KeyboardAvoidingView, Linking, Modal, Platform, Pressable, ScrollView, View } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import Text from '../components/AppText';
import AppTextInput from '../components/AppTextInput';
import PlatformActionButton from '../components/PlatformActionButton';
import { useAppTheme } from '../theme/ThemeProvider';
import { captureRegistration, cameraOcrAvailable } from './captureRegistration';
import { normalizeRegistration, scannedTailnumber } from './registrationCandidates.mjs';

export default function RegistrationScanButton({ aircraft, tailnumbers, beforeCapture, onConfirm, onBusyChange, onOpen }) {
  const { colors } = useAppTheme();
  const [busy, setBusy] = useState(false);
  const [review, setReview] = useState(null);
  const [registration, setRegistration] = useState('');
  const [message, setMessage] = useState(null);
  const [settings, setSettings] = useState(false);
  const running = useRef(false);
  const mounted = useRef(true);
  useEffect(() => { mounted.current = true; return () => { mounted.current = false; }; }, []);
  const match = scannedTailnumber(tailnumbers, registration, aircraft);
  const valid = /^[A-Z0-9]+(?:-[A-Z0-9]+)?$/.test(registration) && registration.length >= 3 && registration.length <= 8;
  const close = () => { if (!running.current) { setReview(null); setMessage(null); } };
  async function scan() {
    if (running.current) return;
    Keyboard.dismiss();
    onOpen?.();
    setMessage(null); setSettings(false);
    running.current = true; setBusy(true); onBusyChange?.(true);
    try {
      const result = await captureRegistration({ aircraft, beforeCapture });
      if (!mounted.current) return;
      if (result.kind === 'unavailable') setMessage('Camera scanning needs an updated app build. You can still enter the tailnumber.');
      if (result.kind === 'permission') {
        setMessage('Allow camera access to scan, or enter the tailnumber.');
        setSettings(!result.canAskAgain);
      }
      if (result.kind === 'review') {
        setReview(result);
        setRegistration(result.candidates.length === 1 ? result.candidates[0] : '');
      }
    } catch (error) {
      if (mounted.current) setMessage(error.code === 'DRAFT_SAVE_FAILED'
        ? 'Couldn’t save your unfinished flight. Keep this form open and try again.'
        : 'Couldn’t read the registration. Try another photo or enter it manually.');
    } finally {
      running.current = false;
      if (mounted.current) { setBusy(false); onBusyChange?.(false); }
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
      if (mounted.current) { setBusy(false); onBusyChange?.(false); }
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
    <Modal visible={Boolean(review)} transparent animationType="fade" onRequestClose={close}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1, justifyContent: 'center', padding: 20, backgroundColor: '#00000088' }}>
        <View accessibilityViewIsModal style={{ backgroundColor: colors.surface, borderRadius: 12, padding: 18, maxHeight: '90%' }}>
          <ScrollView keyboardShouldPersistTaps="handled">
            <Text weight="600" style={{ fontSize: 21, color: colors.text }}>Review Tailnumber</Text>
            <Text style={{ color: colors.muted, marginTop: 10 }}>{review?.candidates.length ? 'Check the registration and correct any misread characters.' : 'No registration found. Enter it below or try another photo.'}</Text>
            {Boolean(review?.candidates.length > 1) && <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 10 }}>
              {review.candidates.map(value => <PlatformActionButton key={value} title={value} variant="text" onPress={() => setRegistration(value)} />)}
            </View>}
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
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 6 }}>
              <PlatformActionButton title="Retake" variant="text" disabled={busy || !cameraOcrAvailable} onPress={() => { setReview(null); setTimeout(() => { if (mounted.current) scan(); }, 350); }} />
              <PlatformActionButton title="Cancel" variant="text" disabled={busy} onPress={close} />
            </View>
          </ScrollView>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  </>;
}
