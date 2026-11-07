export function formatAppVersion({ projectVersion, nativeVersion, buildVersion, expoGo, development }) {
  // Expo Go's native version/build belong to Expo Go, not Direct2Logbook.
  const version = (expoGo ? projectVersion : nativeVersion || projectVersion) || 'Unavailable';
  const details = [];
  if (!expoGo && buildVersion) details.push(`Build ${buildVersion}`);
  if (expoGo || development) details.push('Development');
  return details.length ? `${version} (${details.join(', ')})` : version;
}
