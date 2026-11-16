# Mobile form keyboard handling

Expo SDK 58 uses edge-to-edge Android windows. `adjustResize` in the manifest
alone does not guarantee the React Native form viewport shrinks above the IME.
A physical Pixel reproduction showed the scroll viewport continuing underneath
the numeric keyboard, so JS focus/offset arithmetic alone was insufficient.

- The root uses `KeyboardProvider` from the Expo-compatible
  `react-native-keyboard-controller` version, with keyboard preloading disabled.
- `FormScrollView` uses its `KeyboardAwareScrollView`, keeping the existing list
  overflow indicators. Native focus, selection and IME movement drive scrolling.
- `ScrollableFormCard` uses a `KeyboardStickyView` for its existing Save footer.
  The measured footer height plus a 12-point gap is supplied as `bottomOffset`.
- `FormKeyboardAvoidingView` remains a layout-only compatibility wrapper. Adding
  another avoiding view around aware scrolling/sticky footers counts IME space
  twice. The isolated single-field OCR modal uses an avoiding view and ordinary
  scrolling instead.
- The replaced custom focus/measurement controller and its algorithm tests were
  removed rather than retaining unused code or counting those tests as coverage
  of native keyboard behavior.

Native builds are required for the keyboard-aware implementation. An optional module adapter keeps Expo Go/older builds usable with ordinary ScrollView and padding avoidance, without eagerly loading missing native bindings.
Validate actual field and footer bounds on physical devices, including numeric
Target Hours on long Time in Type / Crew Position / Company reminders, moving
between inputs with the keyboard open, and keyboard dismissal. Do not save or
change real records during this visual check. Unit test results and JS exports
alone do not demonstrate keyboard visibility.

References: https://docs.expo.dev/guides/keyboard-handling/
and the controller's official `AwareScrollViewStickyFooter` example.

Pixel verification, build 28: on Edit Reminder -> Time in Type, the numeric
keyboard was open and Target Hours was focused. The actual accessibility bounds
were field `[69,1054][1013,1169]`, Save `[32,1224][1049,1351]`. A physical screenshot
confirmed both above the keyboard. No reminder was saved during this check.
The native adapter aliases the exact same controller components on this build;
its basic fallback is for Expo Go/older binaries only.
