import React, { useState } from 'react';
import { ActivityIndicator, Alert, Linking, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { WebView } from 'react-native-webview';
import Text from '../components/AppText';
import PlatformActionButton from '../components/PlatformActionButton';
import { useAppTheme } from '../theme/ThemeProvider';
import { openContactEmail } from './contactEmail';

const policyURL = 'https://direct2logbook.com/privacy/';

export default function PrivacyPolicyScreen() {
  const { colors } = useAppTheme();
  const [failed, setFailed] = useState(false);

  function allowNavigation(request) {
    if (request.url === policyURL) return true;
    if (request.url === 'mailto:admin@direct2logbook.com' || request.url === 'mailto:support@direct2logbook.com') {
      openContactEmail(request.url.slice('mailto:'.length));
    } else if (request.isTopFrame !== false && request.url.startsWith('https://')) {
      // Keep our policy in the app; let readers follow the providers' own policies.
      Linking.openURL(request.url).catch(() => Alert.alert('Could not open link', 'Please try again.'));
    }
    return false;
  }

  return <SafeAreaView edges={['left', 'right', 'bottom']} style={{ flex: 1, backgroundColor: colors.background }}>
    {failed ? <View style={styles.error}>
      <Text style={{ textAlign: 'center' }}>Couldn’t load the privacy policy. Check your connection and try again.</Text>
      <PlatformActionButton title="Try Again" variant="text" onPress={() => setFailed(false)} />
    </View> : <WebView
      source={{ uri: policyURL }}
      originWhitelist={['*']}
      onShouldStartLoadWithRequest={allowNavigation}
      javaScriptEnabled={false}
      setSupportMultipleWindows={false}
      thirdPartyCookiesEnabled={false}
      startInLoadingState
      renderLoading={() => <View style={styles.loading}><ActivityIndicator color={colors.primary} /></View>}
      onError={() => setFailed(true)}
      onHttpError={({ nativeEvent }) => {
        if (nativeEvent.url === policyURL) setFailed(true);
      }}
    />}
  </SafeAreaView>;
}

const styles = StyleSheet.create({
  error: { flex: 1, justifyContent: 'center', padding: 24 },
  loading: { ...StyleSheet.absoluteFillObject, justifyContent: 'center', alignItems: 'center' },
});
