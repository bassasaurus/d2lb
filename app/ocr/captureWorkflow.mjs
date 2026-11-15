import { registrationCandidates } from './registrationCandidates.mjs';

// The capture flow returns suggestions only; choosing a tailnumber and saving
// remain explicit form actions. All image processing stays on the device.
export async function scanRegistrationPhoto({ aircraft, requestPermission, beforeCapture, takePhoto, recognize, removePhoto }) {
  const permission = await requestPermission();
  if (!permission.granted) return { kind: 'permission', canAskAgain: permission.canAskAgain };
  try { await beforeCapture?.(); }
  catch { const error = new Error('Draft could not be saved.'); error.code = 'DRAFT_SAVE_FAILED'; throw error; }
  const photo = await takePhoto();
  if (photo.canceled) return { kind: 'cancelled' };
  const uri = photo.assets?.[0]?.uri;
  if (!uri || !uri.startsWith('file://')) throw new Error('Camera image missing.');
  try {
    return { kind: 'review', candidates: registrationCandidates(await recognize(uri), aircraft) };
  } finally {
    try { await removePhoto(uri); } catch { /* Cleanup must not discard successful recognition. */ }
  }
}
