import { requireOptionalNativeModule } from 'expo';
import { scanRegistrationPhoto } from './captureWorkflow.mjs';

const recognizer = requireOptionalNativeModule('TailnumberOcr');
export const cameraOcrAvailable = Boolean(recognizer && requireOptionalNativeModule('ExponentImagePicker'));
export async function captureRegistration({ aircraft, beforeCapture }) {
  if (!cameraOcrAvailable) return { kind: 'unavailable' };
  // Keep Expo Go and older development builds usable for manual entry.
  const ImagePicker = require('expo-image-picker');
  const { File } = require('expo-file-system');
  return scanRegistrationPhoto({
    aircraft, beforeCapture,
    requestPermission: () => ImagePicker.requestCameraPermissionsAsync(),
    takePhoto: () => ImagePicker.launchCameraAsync({ mediaTypes: ['images'], allowsEditing: true, quality: 1, exif: false, base64: false }),
    recognize: uri => recognizer.recognize(uri),
    removePhoto: uri => { const file = new File(uri); if (file.exists) file.delete(); },
  });
}
