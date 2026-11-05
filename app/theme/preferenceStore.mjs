export const THEME_KEY = 'appearance-preference';
const valid = value => ['system', 'light', 'dark'].includes(value);
export function createPreferenceStore(storage) {
  let queued = Promise.resolve();
  return {
    async load() {
      const preference = await storage.getItem(THEME_KEY);
      return valid(preference) ? preference : 'system';
    },
    save(preference) {
      if (!valid(preference)) return Promise.reject(new Error('Unknown appearance preference.'));
      const write = queued.catch(() => {}).then(async () => {
        await storage.setItem(THEME_KEY, preference);
        return preference;
      });
      queued = write;
      return write;
    },
  };
}
