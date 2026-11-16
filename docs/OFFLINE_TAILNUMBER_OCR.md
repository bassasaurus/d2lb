# Offline tailnumber camera workflow

The camera button is beside Tailnumber on flight create/update forms. It requests
camera permission only when tapped and flushes the unfinished flight draft before
opening the in-app CameraView. Pressing Capture immediately delivers the image
to OCR and shows Reading registration; there is no external camera app, captured
photo preview, separate acceptance or crop/editor step. The user can
review/correct a single detected registration, or adjust the cropped photo if needed. No record is saved
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
- `expo-camera`: in-app live preview and explicit Capture/Cancel buttons. Photo mode
  only; microphone permission and Android audio recording are disabled.
- `expo-file-system`: removes the returned camera/crop cache file after recognition.
- OCR text/photos are not added to drafts, upload operations, or API requests.
  Only the confirmed registration is used by the existing forms.
- Possible N-number readings may interpret I/L/|/! as 1, O as 0, and B before a digit as 8, only when the original line is invalid and the complete interpretation passes the N-number pattern. The review explicitly marks these as possible readings. Already-valid registrations, missing characters, and prefixes are never repaired.

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

If text is recognized but the registration filter finds no candidates, the review
card explains that text was found without displaying raw OCR snippets. Recognition has a 20-second timeout rather than an endless spinner.

## Guide-only recognition and a single editable result

The visible guide and crop share one normalized rectangle. Its measured preview
size is mapped into the orientation-correct photo using centered aspect-fill
scaling, including the pixels hidden at preview edges. Only that cropped image
is passed to OCR; missing dimensions or failed cropping stop recognition instead
of falling back to the full photo. The full photo is removed after recognition. Only the guide crop stays in the local cache while review/adjustment is open; it is removed on close, retake, confirmation or unmount. Cache cleanup is best-effort if the process terminates unexpectedly.

OCR suggestions use conservative N-number formats (up to five characters after N,
starting with a digit, and excluding I/O), hyphenated international patterns, and
common compact international formats. These are suggestions, not registry checks,
and do not change manual registration validation. The review has one editable
field and no candidate buttons. Multiple distinct plausible reads leave it blank
for a retake or manual entry; the app does not invent or repair missing digits.

## Angle, lighting and LCD processing

Android uses bounded bitmap processing and bundled ML Kit; iOS uses Core Image
and Apple Vision. Each keeps the original pass, adds a separate grayscale/lighting
pass, straightens detected text quadrilaterals, and tries bounded rotation variants.
The LCD pass gently averages/softens display-grid detail without sharpening or
thresholding away small strokes. It cannot restore characters erased by glare,
blur or display-refresh bands. The camera guidance advises changing the angle if
bands appear. No camera exposure/shutter control is claimed.

A strict majority with a clear lead may select a consistent reading across image
passes. If any single pass detects multiple registrations, they remain ambiguous:
extra focused passes cannot vote a second registration out of the photo. A single
editable field is used throughout, with explicit user confirmation before the
registration is used. Look-alike interpretations are marked as possible readings.

Adjust Photo lets the user position four corners around the registration *within
the original guide crop*. A projective transform straightens that quadrilateral
before running the same OCR passes. Crossed, degenerate or out-of-bounds corners
are rejected on both the JavaScript and native sides. It never expands scanning
outside the captured guide. Android work has a bounded time budget; image variants
are recycled after use. These are image-processing heuristics, not a trained
registration-specific OCR model or a registry lookup.

Tests cover crop geometry, candidate agreement, multiple registrations, disclosed
look-alikes, retention/cleanup, and malformed quadrilaterals. Android instrumented
tests exercise projective correction and a synthetic low-contrast LCD-style grid
through the real bundled recognizer. The supplied aircraft photos were also tried
on Pixel: some severe-angle/worn/stencil examples still fail even with adjustment.
The synthetic screen test is not evidence for every real LCD refresh pattern.
Physical camera and real LCD testing remain necessary; no six-of-six accuracy
claim is made. iOS native compilation/device accuracy must be verified in an iOS
build; Swift syntax and the iOS JavaScript export alone do not prove either.

An invalid native shape hint cannot suppress a valid reading from the original
ML Kit recognizer. If shared JS validation finds no usable registration, the
original recognizer may retry the *same guide-only file*. That fallback is disabled
for adjusted perspective crops, since the original recognizer cannot apply their
quadrilateral. It must never expand a selected crop silently. Fallback results
are marked for review. Direct-image benchmark results must be graded through
this full selection/fallback path, not just the scene model's raw output.
