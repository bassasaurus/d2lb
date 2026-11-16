import { recognizeRegistrationImage } from './recognizeImage.mjs';
import { registrationCandidates, registrationScanReview } from './registrationCandidates.mjs';
import { guidePhotoCrop } from './guideCrop.mjs';
import { requireOptionalNativeModule } from 'expo';
import { scanRegistrationPhoto } from './captureWorkflow.mjs';

const recognizer = requireOptionalNativeModule('TailnumberOcr');
export const cameraOcrAvailable = Boolean(recognizer && requireOptionalNativeModule('ExpoCamera') && requireOptionalNativeModule('ExpoImageManipulator'));
export async function captureRegistration({ aircraft, beforeCapture, onRecognizing, takePhoto }) {
  if (!cameraOcrAvailable) return { kind: 'unavailable' };
  // Keep Expo Go and older development builds usable for manual entry.
  const { Camera } = require('expo-camera');
  const { File } = require('expo-file-system');
  const { ImageManipulator, SaveFormat } = require('expo-image-manipulator');
  return scanRegistrationPhoto({
    aircraft, beforeCapture, onRecognizing, retainPreparedPhoto: true,
    requestPermission: () => Camera.requestCameraPermissionsAsync(),
    takePhoto,
    preparePhoto: async photo => {
      const context = ImageManipulator.manipulate(photo.uri);
      try {
        context.crop(guidePhotoCrop(photo, photo.preview));
        const cropped = await context.renderAsync();
        try { return await cropped.saveAsync({ format: SaveFormat.JPEG, compress: 1 }); }
        finally { cropped.release(); }
      } finally { context.release(); }
    },
    recognize: uri => recognizeRegistration(uri, [], aircraft),
    removePhoto: uri => { const file = new File(uri); if (file.exists) file.delete(); },
  });
}

async function recognizeRegistration(uri, corners = [], aircraft = '') {
  return recognizeRegistrationImage({
    enhanced: typeof recognizer?.recognizeEnhanced === 'function' ? () => recognizer.recognizeEnhanced(uri, corners) : null,
    legacy: () => recognizer.recognize(uri), corners, aircraft,
  });
}

export function removeRegistrationPhoto(photo) {
  if (!photo?.uri) return;
  try { const { File } = require('expo-file-system'); const file = new File(photo.uri); if (file.exists) file.delete(); } catch { /* Cache cleanup is best-effort. */ }
}
export async function rescanRegistration(photo, corners, aircraft) {
  const lines = await recognizeRegistration(photo.uri, corners, aircraft);
  const passes = Array.isArray(lines?.passes) ? lines.passes : lines;
  const enhanced = Array.isArray(passes) && passes.some(Array.isArray);
  const reading = enhanced ? registrationScanReview(passes, aircraft) : { candidates: registrationCandidates(passes, aircraft) };
  if (lines?.lowConfidence) reading.lowConfidence = true;
  return { kind: 'review', ...reading, photo, recognizedLines: (enhanced ? passes.flat() : passes).filter(value => typeof value === 'string').slice(0, 8) };
}
