export function getApiBaseURL({ platform, isDevice, override }) {
  if (override && override.trim()) return override.trim().replace(/\/+$/, '');
  if (isDevice) return 'https://direct2logbook.com';
  return platform === 'android' ? 'http://10.0.2.2:8000' : 'http://127.0.0.1:8000';
}
