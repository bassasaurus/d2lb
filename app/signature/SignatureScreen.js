import React, { useCallback, useRef, useState } from 'react';
import { Alert, View, useWindowDimensions } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as ScreenOrientation from 'expo-screen-orientation';
import Text from '../components/AppText';
import { ScrollView } from '../components/OverflowLists';
import PlatformActionButton from '../components/PlatformActionButton';
import DraftForm from '../drafts/DraftForm';
import SignaturePad from './SignaturePad';
import api from '../api/axiosConfig';
import { useAppTheme } from '../theme/ThemeProvider';

export default function SignatureScreen({ route, navigation }) {
  const { colors } = useAppTheme();
  const { width, height } = useWindowDimensions();
  const draftHandle = useRef(null);
  const savedNavigation = useRef(false);
  const [orientationError, setOrientationError] = useState('');
  useFocusEffect(useCallback(() => {
    const rotating = ScreenOrientation.lockAsync(ScreenOrientation.OrientationLock.LANDSCAPE)
      .catch(() => setOrientationError('Automatic rotation is unavailable. You can still sign below.'));
    return () => { rotating.then(() => ScreenOrientation.lockAsync(ScreenOrientation.OrientationLock.PORTRAIT_UP)).catch(() => {}); };
  }, []));
  return <SafeAreaView edges={['left', 'right', 'bottom', 'top']} style={{ flex: 1, backgroundColor: colors.background, paddingHorizontal: 12 }}>
    <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
      <Text size={18} weight="600">Signature</Text>
      <PlatformActionButton title="Back" variant="text" onPress={() => navigation.goBack()} />
    </View>
    <ScrollView contentContainerStyle={{ flexGrow: 1, justifyContent: 'center' }}>
    <DraftForm kind="profile-signature" recordKey="signature" initialValues={{ strokes: [], revision: route.params.revision }}
      draftHandle={draftHandle} savedNavigation={savedNavigation} onSubmit={async (values, helpers) => {
        if (!values.strokes.length) { helpers.setStatus('Draw your signature before saving.'); helpers.setSubmitting(false); return; }
        try {
          await api.put('/api/mobile/signature/', values);
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
        } finally { helpers.setSubmitting(false); }
      }}>
      {({ values, setFieldValue, handleSubmit, isSubmitting, status }) => <View style={{ width: Math.min(width - 48, Math.max(240, (height - 190) * 3)), alignSelf: 'center', gap: 6 }}>
        <SignaturePad strokes={values.strokes} onChange={strokes => setFieldValue('strokes', strokes)} disabled={isSubmitting} />
        <View style={{ flexDirection: 'row', justifyContent: 'space-evenly', alignItems: 'center' }}>
          <PlatformActionButton title="Undo" variant="text" disabled={isSubmitting || !values.strokes.length}
            onPress={() => setFieldValue('strokes', values.strokes.slice(0, -1))} />
          <PlatformActionButton title="Redo" variant="text" disabled={isSubmitting || !values.strokes.length} onPress={() => Alert.alert('Draw again?', 'Clear this drawing and start over?', [
            { text: 'Cancel', style: 'cancel' }, { text: 'Clear', onPress: () => setFieldValue('strokes', []) }])} />
          <PlatformActionButton title={isSubmitting ? 'Saving…' : 'Save'} disabled={isSubmitting || !values.strokes.length} onPress={handleSubmit} />
        </View>
        {orientationError ? <Text color={colors.danger} style={{ textAlign: 'center' }}>{orientationError}</Text> : null}
        {status ? <Text color={colors.danger} accessibilityLiveRegion="polite" style={{ textAlign: 'center' }}>{status}</Text> : null}
      </View>}
    </DraftForm>
    </ScrollView>
  </SafeAreaView>;
}
