import { KeyboardAvoidingView as BasicAvoidingView, Platform, ScrollView, TurboModuleRegistry, View } from 'react-native';

// Keep Expo Go and older native builds usable for manual entry. Loading the
// controller's bindings eagerly would throw before those builds can show a form.
const implementation = Platform.OS !== 'web' && TurboModuleRegistry.get('KeyboardController')
  ? require('react-native-keyboard-controller') : null;

export const nativeKeyboardAvailable = Boolean(implementation);
export const KeyboardProvider = implementation?.KeyboardProvider ?? function BasicKeyboardProvider({ children }) { return children; };
export const KeyboardAwareScrollView = implementation?.KeyboardAwareScrollView ?? ScrollView;
export const KeyboardStickyView = implementation?.KeyboardStickyView ?? View;
export const KeyboardAvoidingView = implementation?.KeyboardAvoidingView ?? BasicAvoidingView;
