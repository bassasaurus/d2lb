// Shared by the visible overlay and the photo crop. CameraView uses centered
// aspect-fill previews (no `ratio` prop); processed photos are orientation-correct.
export const REGISTRATION_GUIDE = Object.freeze({ x: 0.08, y: 0.42, width: 0.84, height: 0.16 });
export function guidePhotoCrop(photo, preview) {
  if (![photo?.width, photo?.height, preview?.width, preview?.height].every(value => Number.isFinite(value) && value > 0))
    throw new Error('Camera dimensions are unavailable.');
  const scale = Math.max(preview.width / photo.width, preview.height / photo.height);
  const offsetX = (photo.width - preview.width / scale) / 2;
  const offsetY = (photo.height - preview.height / scale) / 2;
  // Ignore floating-point dust at integer boundaries, then round inward.
  const ceilPixel = value => Math.ceil(value - 1e-7);
  const floorPixel = value => Math.floor(value + 1e-7);
  const originX = Math.max(0, ceilPixel(offsetX + REGISTRATION_GUIDE.x * preview.width / scale));
  const originY = Math.max(0, ceilPixel(offsetY + REGISTRATION_GUIDE.y * preview.height / scale));
  const right = Math.min(photo.width, floorPixel(offsetX + (REGISTRATION_GUIDE.x + REGISTRATION_GUIDE.width) * preview.width / scale));
  const bottom = Math.min(photo.height, floorPixel(offsetY + (REGISTRATION_GUIDE.y + REGISTRATION_GUIDE.height) * preview.height / scale));
  if (right <= originX || bottom <= originY) throw new Error('The registration guide is too small.');
  return { originX, originY, width: right - originX, height: bottom - originY };
}
