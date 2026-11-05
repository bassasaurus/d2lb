export function installSessionAuth(api, session) {
  api.interceptors.request.use(async config => {
    if (config.skipAuth) return config;
    const token = await session.getToken();
    if (config.pinnedToken && config.pinnedToken !== token) throw new Error('Account changed during request.');
    config.authSession = session.snapshot();
    if (token) config.headers.Authorization = `Token ${token}`;
    return config;
  });
  api.interceptors.response.use(response => {
    const expected = response.config.authSession;
    if (expected && expected.version !== session.snapshot().version) {
      throw new Error('Session changed during request.');
    }
    return response;
  }, async error => {
    const expected = error.config?.authSession;
    if (error.response?.status === 401 && expected?.token) {
      try { await session.signOut(expected, 'expired'); }
      catch { /* Request fails; don't claim a successful logout if secure deletion failed. */ }
    }
    return Promise.reject(error);
  });
}
