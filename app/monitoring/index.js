import { replayConfiguration } from './replay.mjs';
import * as Sentry from '@sentry/react-native';
import Constants from 'expo-constants';
import * as Application from 'expo-application';
import * as Updates from 'expo-updates';
import { Platform } from 'react-native';
import { isRunningInExpoGo } from 'expo';
import { createMonitoring } from './core.mjs';
import { safeEvent, safeBreadcrumb } from './policy.mjs';

export const monitoringEnabled = !__DEV__ && !isRunningInExpoGo();
export const monitoring = createMonitoring({ sdk: Sentry, enabled: monitoringEnabled });
export function initializeMonitoring() {
  Sentry.init({
    dsn: 'https://45a431f2fa3541a09ba6320ae658b609@o369988.ingest.sentry.io/6397150',
    enabled: monitoringEnabled, debug: false, sendDefaultPii: false,
    environment: __DEV__ ? 'development' : 'production',
    attachScreenshot: false, attachViewHierarchy: false,
    enableLogs: false, tracesSampleRate: 0,
    ...replayConfiguration(Sentry, monitoringEnabled),
    maxBreadcrumbs: 40, beforeSend: safeEvent, beforeBreadcrumb: safeBreadcrumb,
  });
  // Leave release/dist to the native SDK so they match the build's upload hooks.
  Sentry.setTags({ app_version: Application.nativeApplicationVersion || Constants.expoConfig?.version || 'unknown',
    app_build: Application.nativeBuildVersion || 'development', app_platform: Platform.OS,
    build_channel: Updates.channel || (__DEV__ ? 'development' : 'installed') });
}
export function recordScreen(state) {
  let route = state?.routes?.[state.index ?? 0];
  while (route?.state) route = route.state.routes?.[route.state.index ?? 0];
  if (route?.name) monitoring.breadcrumb({ phase: 'screen', screen: route.name });
}
export function observeSyncEvent(details, error) {
  monitoring.breadcrumb(details);
  if (details.phase === 'failed' && error) monitoring.report(error, { ...details, action: 'sync' });
}

export function recordApiEnvironment(origin) {
  let environment = 'custom';
  try { environment = new URL(origin).hostname === 'direct2logbook.com' ? 'production' : 'local-or-test'; } catch { /* No raw URL is recorded. */ }
  Sentry.setTag('api_environment', environment);
}

// Explicitly opted-in diagnostic builds only; never shown in ordinary releases.
export const verificationAvailable = monitoringEnabled && process.env.EXPO_PUBLIC_SENTRY_DIAGNOSTICS === 'true';
export async function verifySentryException() {
  if (!verificationAvailable) return null;
  const eventId = Sentry.captureException(new Error('Sentry verification exception'), {
    level: 'error', tags: { feature: 'verification' },
  });
  const flushed = await Sentry.flush(10000);
  return { eventId, flushed };
}
