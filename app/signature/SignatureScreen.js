import React, { useCallback, useRef, useState } from 'react';
import { Alert, View } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as ScreenOrientation from 'expo-screen-orientation';
import Text from '../components/AppText';
import PlatformActionButton from '../components/PlatformActionButton';
import DraftForm from '../drafts/DraftForm';
import SignaturePad from './SignaturePad';
import api from '../api/axiosConfig';
import { useAppTheme } from '../theme/ThemeProvider';

export default function SignatureScreen({ route, navigation }) {
  const { colors } = useAppTheme();
  const draftHandle = useRef(null);
  const savedNavigation = useRef(false);
  const busy = useRef(false);
  const cancel = async () => {
    if (busy.current) return;
    busy.current = true;
    try {
      await draftHandle.current.discardAndClose();
      savedNavigation.current = true;
      await ScreenOrientation.lockAsync(ScreenOrientation.OrientationLock.PORTRAIT_UP).catch(() => {});
      navigation.popTo('ProfileOverview');
    } catch {
      Alert.alert('Unable to discard drawing', 'Please try Cancel again.');
    } finally { busy.current = false; }
  };
  const [orientationError, setOrientationError] = useState('');
  useFocusEffect(useCallback(() => {
    const rotating = ScreenOrientation.lockAsync(ScreenOrientation.OrientationLock.LANDSCAPE)
      .catch(() => setOrientationError('Automatic rotation is unavailable. You can still sign below.'));
    return () => { rotating.then(() => ScreenOrientation.lockAsync(ScreenOrientation.OrientationLock.PORTRAIT_UP)).catch(() => {}); };
  }, []));
  return <SafeAreaView edges={['left', 'right', 'bottom', 'top']} style={{ flex: 1, backgroundColor: colors.background, paddingHorizontal: 8 }}>
    <View style={{ alignItems: 'center', paddingVertical: 8 }}>
      <Text size={18} weight="600" style={{ textAlign: 'center' }}>Capture Signature</Text>
    </View>
    <DraftForm contentStyle={{ flex: 1 }} kind="profile-signature" recordKey="signature" initialValues={{ strokes: [], showExisting: true, revision: route.params.revision }}
      draftHandle={draftHandle} savedNavigation={savedNavigation} onSubmit={async (values, helpers) => {
        if (!values.strokes.length) { helpers.setStatus('Draw your signature before saving.'); helpers.setSubmitting(false); return; }
        busy.current = true;
        try {
          await api.put('/api/mobile/signature/', { strokes: values.strokes, revision: values.revision });
          await draftHandle.current.complete();
          savedNavigation.current = true;
          helpers.resetForm({ values });
          await ScreenOrientation.lockAsync(ScreenOrientation.OrientationLock.PORTRAIT_UP).catch(() => {});
          navigation.goBack();
        } catch (error) {
          helpers.setStatus(error.response?.status === 409 ? error.response.data.detail
            : error.response?.status === 400 ? 'Drawing could not be accepted. Clear it and sign again.'
            : error.response?.status === 404 ? 'Signature saving needs the matching Django API update.'
            : 'Signature could not be saved. Check your connection and retry. Your drawing is kept as a draft.');
        } finally { busy.current = false; helpers.setSubmitting(false); }
      }}>
      {({ values, setFieldValue, handleSubmit, isSubmitting, status }) => <View style={{ flex: 1, gap: 6 }}>
        <SignaturePad style={{ flex: 1, aspectRatio: undefined }} signature={values.showExisting ? route.params.signature : null}
          onBegin={() => setFieldValue('showExisting', false)} strokes={values.strokes} onChange={strokes => setFieldValue('strokes', strokes)} disabled={isSubmitting} />
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 4 }}>
          <View style={{ flex: 1, alignItems: 'flex-start' }}>
            <PlatformActionButton title="Clear" variant="text" destructive disabled={isSubmitting || (!values.strokes.length && !(values.showExisting && route.params.signature))}
              onPress={() => { setFieldValue('strokes', []); setFieldValue('showExisting', false); }} />
          </View>
          <View style={{ flex: 1, alignItems: 'center' }}>
            <PlatformActionButton title="Save" disabled={isSubmitting || !values.strokes.length} onPress={handleSubmit} />
          </View>
          <View style={{ flex: 1, alignItems: 'flex-end' }}>
            <PlatformActionButton title="Cancel" variant="text" disabled={isSubmitting} onPress={cancel} />
          </View>
        </View>
        {orientationError ? <Text color={colors.danger} style={{ textAlign: 'center' }}>{orientationError}</Text> : null}
        {status ? <Text color={colors.danger} accessibilityLiveRegion="polite" style={{ textAlign: 'center' }}>{status}</Text> : null}
      </View>}
    </DraftForm>
  </SafeAreaView>;
}
