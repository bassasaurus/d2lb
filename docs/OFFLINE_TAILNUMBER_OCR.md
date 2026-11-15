# Offline tailnumber camera workflow

Branch: `feat/offline-tailnumber-camera-ocr`.

The camera button is beside Tailnumber on flight create/update forms. It requests
camera permission only when tapped and flushes the unfinished flight draft before
opening the system camera. The user can crop the photo, review/correct the detected
registration, and choose a candidate if more than one is found. No record is saved
by taking a photo or running recognition.

A matching cached or queued tailnumber is selected using its stored spelling.
Hyphens and letter case do not prevent a match. A registration assigned to another
aircraft shows a warning instead of reassigning it. A new registration opens New
Tailnumber with the aircraft and registration filled in. Save queues it through
the existing offline flow and returns to the exact originating flight screen with
its other fields intact and the registration selected. Other New Tailnumber entry
points continue to open Tailnumber Detail after saving.

## Native implementation

- `modules/tailnumber-ocr`: bundled Latin ML Kit (`com.google.mlkit:text-recognition`)
  on Android; Apple Vision on iOS. No remote OCR, Firebase account, or model download.
- `expo-image-picker`: system camera/crop UI, images only. Microphone and photo-library
  permissions are disabled in the config plugin.
- `expo-file-system`: removes the returned camera/crop cache file after recognition.
- OCR text/photos are not added to drafts, upload operations, or API requests.
  Only the confirmed registration is used by the existing forms.
- No automatic O/0 or I/1 corrections: the user must review the text.

A fresh native development/beta build is required. Expo Go and development builds
without this module keep manual entry working and explain that scanning needs an
updated build when the camera button is tapped. JavaScript exports alone do not
prove native OCR is installed or validate camera recognition quality.

## Physical-device checks before release

Use a test account. Run on iPhone and Android in airplane mode, including the first
launch of a fresh installation (to prove the model is bundled):

1. Fill a flight's date, route, duration, role and remarks, then scan an unfamiliar
   registration. Correct a deliberately misread character, add operating rules and
   save the new tailnumber. Confirm the flight still contains all prior values and
   the new registration. The flight itself must remain unsaved.
2. Scan an existing saved/pending registration. It must select it without creating
   another tailnumber; a hyphen difference must not create a duplicate.
3. Scan a registration belonging to a different aircraft. Confirm it warns instead
   of changing an assignment.
4. Cancel camera capture and review. Neither action may clear the previous selection
   or create a record. Cancel New Tailnumber and confirm the flight is retained.
5. Deny camera permission; manual entry must still work. Permanently denied access
   should offer Open Settings. An unreadable image must allow manual correction or
   retaking the photo.
6. Reconnect and confirm normal tailnumber-before-flight sync still applies.

The iOS Simulator has no physical camera. Unit tests cover candidate extraction,
cache matching, navigation targeting, permission/cancellation, draft persistence
ordering and image cleanup. Camera OCR accuracy requires a physical-device check.
