import { Alert, Linking } from 'react-native';

export function openContactEmail(recipient = 'support@direct2logbook.com') {
  return Linking.openURL(`mailto:${recipient}`).catch(() => {
    Alert.alert('Could not open email',
      `Set up a mail app on your device, then try again. You can also email ${recipient}.`);
  });
}
