import { Alert, Linking, Platform } from 'react-native';
import Constants from 'expo-constants';
import * as Application from 'expo-application';
import { isRunningInExpoGo } from 'expo';
import { monitoring } from '../monitoring';
import { formatAppVersion } from './appVersion.mjs';
import { supportEmailURL } from './supportDetails.mjs';

export function openContactEmail(recipient = 'support@direct2logbook.com') {
  // User explicitly selects support; this is informational, never an error alert.
  const reference = monitoring.supportReference();
  const url = supportEmailURL({ recipient, reference, platform: Platform.OS, osVersion: Platform.Version,
    version: formatAppVersion({ projectVersion: Constants.expoConfig?.version,
      nativeVersion: Application.nativeApplicationVersion, buildVersion: Application.nativeBuildVersion,
      expoGo: isRunningInExpoGo(), development: __DEV__ }) });
  return Linking.openURL(url).catch(() => {
    Alert.alert('Could not open email',
      `Set up a mail app on your device, then try again. You can also email ${recipient}.${reference ? ` Diagnostic reference: ${reference}` : ''}`);
  });
}
