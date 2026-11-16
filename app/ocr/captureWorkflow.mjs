import { registrationCandidates, registrationScanReview } from './registrationCandidates.mjs';

// The capture flow returns suggestions only; choosing a tailnumber and saving
// remain explicit form actions. All image processing stays on the device.
export async function scanRegistrationPhoto({ aircraft, requestPermission, beforeCapture, takePhoto, recognize, removePhoto, preparePhoto = async photo => photo, onRecognizing, recognitionTimeoutMs = 20000, retainPreparedPhoto = false }) {
  const permission = await requestPermission();
  if (!permission.granted) return { kind: 'permission', canAskAgain: permission.canAskAgain };
  try { await beforeCapture?.(); }
  catch { const error = new Error('Draft could not be saved.'); error.code = 'DRAFT_SAVE_FAILED'; throw error; }
  const photo = await takePhoto();
  if (photo.canceled) return { kind: 'cancelled' };
  const uri = photo.assets?.[0]?.uri;
  if (!uri || !uri.startsWith('file://')) throw new Error('Camera image missing.');
  let timer;
  let scanUri;
  let retained = false;
  try {
    onRecognizing?.();
    const prepared = await preparePhoto(photo.assets[0]);
    scanUri = prepared?.uri;
    if (!scanUri?.startsWith('file://')) throw new Error('Prepared camera image missing.');
    const lines = await Promise.race([
      Promise.resolve().then(() => recognize(scanUri)),
      new Promise((resolve, reject) => { timer = setTimeout(() => reject(new Error('Recognition timed out.')), recognitionTimeoutMs); }),
    ]);
    const passes = Array.isArray(lines?.passes) ? lines.passes : lines;
    const enhanced = Array.isArray(passes) && passes.some(Array.isArray);
    const reading = enhanced ? registrationScanReview(passes, aircraft) : { candidates: registrationCandidates(passes, aircraft) };
    if (lines?.lowConfidence) reading.lowConfidence = true;
    const { candidates } = reading;
    const recognized = enhanced ? passes.flat() : passes;
    retained = retainPreparedPhoto;

    return { kind: 'review', ...reading, ...(retained ? { photo: prepared } : {}), ...(candidates.length ? {} : { recognizedLines: (Array.isArray(recognized) ? recognized : []).filter(line => typeof line === 'string').slice(0, 8).map(line => line.slice(0, 100)) }) };
  } finally {
    clearTimeout(timer);
    if (!retained && scanUri && scanUri !== uri) { try { await removePhoto(scanUri); } catch { /* Clean up the crop independently. */ } }
    try { if (!retained || scanUri !== uri) await removePhoto(uri); } catch { /* Cleanup must not discard successful recognition. */ }
  }
}
