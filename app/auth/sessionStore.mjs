// Serialized credential changes keep migration, logout and late responses ordered.
export function createSessionStore({ secure, legacy }) {
  const key = 'session-token';
  let current = { ready: false, token: null, version: 0, reason: null };
  let queue = Promise.resolve();
  const listeners = new Set();
  const serial = work => {
    const result = queue.then(work);
    queue = result.catch(() => {});
    return result;
  };
  const publish = (token, reason = null) => {
    current = { ready: true, token, version: current.version + 1, reason };
    for (const listener of listeners) listener(current);
    return current;
  };
  async function load() {
    if (current.ready) return current;
    let token = await secure.get(key);
    const old = await legacy.getItem('token');
    if (!token && old) {
      await secure.set(key, old); // Delete plaintext only after durable secure write.
      token = old;
    }
    await legacy.removeItem('token');
    return publish(token);
  }
  return {
    snapshot: () => current,
    subscribe(listener) { listeners.add(listener); return () => listeners.delete(listener); },
    restore: () => serial(load),
    async getToken() { return (await serial(load)).token; },
    signIn(token) {
      return serial(async () => {
        if (typeof token !== 'string' || !token.trim()) throw new Error('Invalid sign-in response.');
        await secure.set(key, token);
        await legacy.removeItem('token');
        return publish(token);
      });
    },
    signOut(expected, reason = null) {
      return serial(async () => {
        await load();
        // An old request must never sign out a newer session, even for the same token.
        if (expected && (expected.token !== current.token || expected.version !== current.version)) return false;
        await legacy.removeItem('token');
        await secure.remove(key);
        publish(null, reason);
        return true;
      });
    },
  };
}
