import { expectedFailure } from './policy.mjs';

export function shouldCaptureReplay(event, hint = {}) {
  if (event.tags?.feature === 'support' || ['info', 'debug', 'log', 'warning'].includes(event.level)) return false;
  if (!event.exception?.values?.length || expectedFailure(hint.originalException)) return false;
  if (expectedFailure({ response: { status: event.contexts?.diagnostic?.http_status } })) return false;
  return !event.exception.values.some(value => expectedFailure({ message: value.value }));
}

export function replayConfiguration(sdk, enabled) {
  return {
    replaysSessionSampleRate: 0,
    replaysOnErrorSampleRate: enabled ? 1 : 0,
    integrations: enabled ? [sdk.mobileReplayIntegration({
      maskAllText: false,
      maskAllImages: false,
      maskAllVectors: false,
      captureSurfaceViews: false,
      networkCaptureBodies: false,
      networkDetailAllowUrls: [],
      networkRequestHeaders: [],
      networkResponseHeaders: [],
      beforeErrorSampling: shouldCaptureReplay,
    })] : [],
  };
}
