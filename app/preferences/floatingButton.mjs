const clamp = (value, min, max) => Math.max(min, Math.min(max, value));
export function buttonBounds(width, height, size, bottomInset = 0) {
  return { minX: 10, minY: 10, maxX: Math.max(10, width - size - 10),
    maxY: Math.max(10, height - size - Math.max(10, bottomInset + 10)) };
}
export function buttonPoint(preference, bounds) {
  const valid = preference && Number.isFinite(preference.x) && Number.isFinite(preference.y);
  return { x: valid ? bounds.minX + clamp(preference.x, 0, 1) * (bounds.maxX - bounds.minX) : bounds.maxX,
    y: valid ? bounds.minY + clamp(preference.y, 0, 1) * (bounds.maxY - bounds.minY) : Math.max(bounds.minY, bounds.maxY - 40) };
}
export function clampButtonPoint(point, bounds) {
  return { x: clamp(point.x, bounds.minX, bounds.maxX), y: clamp(point.y, bounds.minY, bounds.maxY) };
}
export function buttonPreference(point, bounds) {
  const clamped = clampButtonPoint(point, bounds);
  return { x: (clamped.x - bounds.minX) / (bounds.maxX - bounds.minX || 1),
    y: (clamped.y - bounds.minY) / (bounds.maxY - bounds.minY || 1) };
}
export function createButtonPositionStore(storage) {
  let value = null, version = 0, loaded;
  let writes = Promise.resolve();
  const listeners = new Set();
  const publish = () => listeners.forEach(listener => listener(value));
  return {
    snapshot: () => value,
    subscribe(listener) { listeners.add(listener); return () => listeners.delete(listener); },
    load() {
      if (!loaded) {
        const generation = version;
        loaded = storage.getItem('floating-add-position').then(raw => {
          const data = raw ? JSON.parse(raw) : null;
          if (generation === version && data && Number.isFinite(data.x) && Number.isFinite(data.y)) {
            value = { x: clamp(data.x, 0, 1), y: clamp(data.y, 0, 1) }; publish();
          }
          return value;
        }).catch(() => value);
      }
      return loaded;
    },
    save(next) {
      version++;
      value = next;
      publish();
      const write = writes.catch(() => {}).then(() => storage.setItem('floating-add-position', JSON.stringify(next)));
      writes = write;
      return write;
    },
  };
}
