export function connectionNotice(connected, error = '', airplaneMode = false) {
  if (airplaneMode) return { message: 'Airplane Mode', error: false, durationMs: 1000 };
  return { message: error || (connected ? 'Connected' : 'Not Connected'), error: Boolean(error), durationMs: error ? null : 1000 };
}

export function syncConnectionFailure(error) {
  if (!error?.response && (error?.isAxiosError || ['ERR_NETWORK', 'ECONNABORTED', 'ETIMEDOUT'].includes(error?.code) || error?.message === 'Offline')) {
    return { connected: false, error: '' };
  }
  const status = error?.response?.status;
  return { connected: Boolean(error?.response), error: status === 401 ? 'Sign in again to sync.'
    : status === 404 ? 'Sync is unavailable.\nTry again later.'
      : 'Sync could not finish.\nPull down to retry.' };
}
