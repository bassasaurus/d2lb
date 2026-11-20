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

## Repeatable photo benchmark

`scripts/ocr-benchmark-android.py` builds a dedicated Android instrumentation app
using the **current** bundled detector, recognizer and model files. It installs
only `com.direct2logbook.ocrbenchmark` and its test package, reads local fixture
images, then removes those two packages. Direct2Logbook's installed app and user
data are untouched. Specify a device serial explicitly; Android is used here
because this tests the Pixel's native engine, rather than a cross-platform screen.

Prepare a local JSON array of objects containing `case`, `file`, `expected` and
optionally `split` and `source`. Image file names are relative to the manifest.
Keep copyright-restricted reference photos outside Git. The November 20 fixtures
and source URLs are saved locally under `Documents/Codex/ocr-benchmark`; they are
not bundled into the production app.

Example (substitute the Gradle executable installed on your machine):

```sh
python3 scripts/ocr-benchmark-android.py \
  --cases "$HOME/Documents/Codex/ocr-benchmark/fixtures/cases.json" \
  --serial YOUR_DEVICE_SERIAL \
  --gradle /path/to/gradle-9.4.1/bin/gradle \
  --output "$HOME/Documents/Codex/ocr-benchmark/results.json"
```

Use the project's Node runtime on PATH. The runner needs the Android SDK 37,
Java (Android Studio's bundled JBR is used when JAVA_HOME is unset), Gradle 9.4.1,
and ADB. Its default ADB port is 5038, adjustable with `--adb-port`. It writes
build/instrumentation logs, raw native results, and a `.report.json` containing
scores from the same shared JavaScript selection and fallback logic used by the
app. An instrumentation pass means the benchmark **ran**, not that every
registration was recognized. Exceptions and empty readings remain misses.

Report full scenes separately from guide-framed crops, and keep newly selected
holdout images separate from examples used to tune recognition. A correct answer
must match the whole registration; a plausible but wrong value is a miss. Two
views/crops of the same image are not independent samples. These are direct-image
measurements, not camera-through-an-LCD, lighting, motion-blur, iOS, or field
accuracy estimates. Testing a screen photo needs an actual photo of that display;
a JPEG displayed directly to the recognizer does not test LCD interference.

The capture guide now spans 16% of preview height (previously 28%), centered at
the same position and using the identical geometry for the on-screen frame and
photo crop. Look-alike repair retains a legitimate trailing L when an O was read
in an N-number's numeric prefix; it still never inserts missing characters or
changes an already valid registration. The proposed value remains user-reviewed.

### November 20 results (Pixel 10)

| Set | Before suffix fix | After suffix fix |
| --- | ---: | ---: |
| Original six photos, split into 11 registration cases | 8/11 (72.7%) | 8/11 (72.7%) |
| Eight new web photos, whole scenes | 4/8 (50%) | 5/8 (62.5%) |
| Same eight photos, guide-style crops | 4/8 (50%) | 5/8 (62.5%) |
| Four additional photos selected after freezing the change | 4/4 (100%) | 4/4 (100%) |

The new-photo total is **9/12 (75%)**, counting each web photo once. Do not add
scene and crop rows together as independent images. Four holdout successes do
not establish a 100% population success rate. The original sheet also contains
two views of the same registration. An 80–90% real-world first-capture target has
**not** been demonstrated.

All 27 scene/crop baseline cases and all four holdout cases ran through the
bundled Android OCR models on the physical Pixel, followed by the app's shared
fallback and result-selection logic. Model/network access is not part of this
recognition path. These runs passed as benchmark executions even where OCR
answers were incorrect.

The shared suffix fix corrects `N6OOLR`/`N60OLR` to the disclosed possible reading
`N600LR`, instead of incorrectly changing the legal `L` to `1`. Original misses
remain F-WTSA (blank), N59LW (read N59LN), and N12345 (blank). Experimental native
padding and prefix changes were evaluated separately and rejected; they are not
in the app branch. Only the shorter shared crop guide, suffix fix, regression
test and benchmark tooling are retained.

Local evidence is under `$HOME/Documents/Codex/ocr-benchmark/`:

- `pixel-nov20-baseline-report.json`: old selection logic on baseline native output.
- `pixel-nov20-final.json` and `.report.json`: 27-case native rerun and current app grading.
- `pixel-nov20-holdout.json` and `.report.json`: four previously untuned image cases.
- `web-cases/sources.json` and `holdout/cases.json`: source pages, image URLs, labels and crop metadata.
- `fixtures/cases.json`: reusable local 27-case input manifest and image hashes.

All expected labels were visually checked. The new sources include aircraft
photographs from [Its Nice That](https://www.itsnicethat.com/articles/david-rothenberg-landing-lights-park-photography-080219),
[SEMET Aviation](https://semetaviation.co.uk/ppl),
[GB Helicopters via Aviapages](https://aviapages.com/company/gb-helicopters/),
[CF-FHB reference photos](https://www.dhc-2.com/CF-FHB_Photo%20page.html),
[Platoon Aviation via Aviapages](https://aviapages.com/company/platoon-aviation/),
and [F-GITD via Aéro-Design](https://www.aerodesignart.com/product-page/casquette-air-france-747-f-gitd-collector).
The manifests retain the full source list. Local benchmark use does not grant
permission to redistribute those images; they are excluded from Git.
