// Android can retrieve a native abort from ApplicationExitInfo on next launch,
// even when the in-process signal handler could not finish writing its report.
export function nativeCrashConfiguration(platform, enabled) {
  return {
    enableNativeCrashHandling: enabled,
    ...(platform === 'android' ? {
      enableNdk: enabled,
      enableNdkScopeSync: enabled,
      enableTombstone: enabled,
      enableHistoricalTombstoneReporting: enabled,
    } : {}),
  };
}
