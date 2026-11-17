import { expectedFailure, safeDetails } from './policy.mjs';
export function createMonitoring({ sdk, enabled, now = () => Date.now() }) {
  const seen = new WeakSet();
  const recent = new Map();
  const safe = work => { try { return work(); } catch { return null; } };
  return {
    breadcrumb(details) { safe(() => sdk.addBreadcrumb({ category: 'app.diagnostic', level: 'info', data: safeDetails(details) })); },
    report(error, details = {}) {
      if (!enabled || expectedFailure(error)) return null;
      if (error && typeof error === 'object') { if (seen.has(error)) return null; seen.add(error); }
      const data = safeDetails({ ...details, http_status: error?.response?.status });
      const key = JSON.stringify([data.resource, data.action, data.http_status, data.record_id ?? data.local_id]);
      if (recent.has(key) && now() - recent.get(key) < 60000) return null;
      recent.set(key, now());
      if (recent.size > 50) recent.delete(recent.keys().next().value);
      const diagnosticError = new Error(data.resource === 'draft' ? 'Local draft operation failed'
        : data.resource === 'database' ? 'Local storage operation failed' : 'Mobile sync failed');
      // Keep original code locations without the original error message/payload.
      const frames = typeof error?.stack === 'string' ? error.stack.split('\n').slice(1)
        .filter(line => /^\s*at /.test(line) || /^[^\s]+@.+:\d+:\d+$/.test(line))
        .map(line => line.replace(/\?[^\s)]*/g, '')) : [];
      if (frames.length) diagnosticError.stack = `${diagnosticError.name}: ${diagnosticError.message}\n${frames.join('\n')}`;
      return safe(() => sdk.captureException(diagnosticError, {
        tags: { feature: data.resource === 'database' || data.resource === 'draft' ? 'storage' : 'sync' },
        contexts: { diagnostic: data },
      }));
    },
    account(id) { safe(() => sdk.setUser(Number.isSafeInteger(id) && id > 0 ? { id: String(id) } : null)); },
    reset() { recent.clear(); safe(() => sdk.setUser(null)); safe(() => sdk.getCurrentScope().clearBreadcrumbs()); },
    supportReference() {
      if (!enabled) return null;
      return safe(() => sdk.captureEvent({ message: 'Support requested', level: 'info', tags: { feature: 'support' } }));
    },
  };
}

// Observe database failures at the driver boundary, never SQL strings or values.
export function monitoredStorage(storage, report) {
  return new Proxy(storage, { get(target, key) {
    const value = target[key];
    if (typeof value !== 'function') return value;
    if (typeof key !== 'string' || !key.endsWith('Async')) return value.bind(target);
    return async (...args) => {
      let callbackFailure;
      if (['withExclusiveTransactionAsync', 'withTransactionAsync'].includes(key) && typeof args[0] === 'function') {
        const callback = args[0];
        args[0] = async tx => {
          try { return await callback(tx ? monitoredStorage(tx, report) : tx); }
          catch (error) { callbackFailure = error; throw error; }
        };
      }
      try { return await value.apply(target, args); }
      catch (error) {
        // Validation inside a transaction is not a database failure. Driver
        // errors within that callback were already observed by its tx wrapper.
        if (error !== callbackFailure) {
          try { report(error, { resource: 'database', action: key.startsWith('get') ? 'read' : 'write' }); } catch { /* Diagnostics never change storage semantics. */ }
        }
        throw error;
      }
    };
  } });
}
