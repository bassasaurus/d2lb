// CameraView returns the photo immediately after our Capture button is pressed.
// There is no external camera intent or second photo-acceptance screen.
export async function captureCameraPhoto(camera, timeoutMs = 10000) {
  if (!camera?.takePictureAsync) throw new Error('Camera is not ready.');
  let timer;
  try {
    const photo = await Promise.race([
      camera.takePictureAsync({ quality: 1, exif: false, base64: false, skipProcessing: false }),
      new Promise((resolve, reject) => { timer = setTimeout(() => reject(new Error('Capture timed out.')), timeoutMs); }),
    ]);
    if (!photo?.uri?.startsWith('file://')) throw new Error('No local camera image.');
    return photo;
  } finally { clearTimeout(timer); }
}
