import { registrationCandidates, registrationScanReview } from './registrationCandidates.mjs';

export async function recognizeRegistrationImage({ enhanced, legacy, corners = [], aircraft = '' }) {
  if (!enhanced) {
    if (corners.length) throw new Error('Photo adjustment needs an updated app build.');
    return legacy();
  }
  let result;
  try { result = await enhanced(); }
  catch (error) {
    // Legacy OCR cannot apply the selected perspective quadrilateral. Never
    // silently expand an adjusted scan back to the surrounding guide crop.
    if (corners.length) throw error;
    return { passes: [await legacy()], lowConfidence: true };
  }
  const passes = Array.isArray(result?.passes) ? result.passes : result;
  const nested = Array.isArray(passes) && passes.some(Array.isArray);
  const candidates = nested ? registrationScanReview(passes, aircraft).candidates : registrationCandidates(passes, aircraft);
  if (candidates.length || corners.length) return result;
  // A model's shape hint is not registration validation. An invalid short read
  // must not prevent the older recognizer from trying this same guide-only file.
  const fallback = await legacy();
  return { passes: [...(nested ? passes : [Array.isArray(passes) ? passes : []]), fallback], lowConfidence: true };
}
