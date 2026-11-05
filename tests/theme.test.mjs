import test from 'node:test';
import assert from 'node:assert/strict';
import { PALETTES, effectiveScheme } from '../app/theme/palettes.mjs';
import { createPreferenceStore, THEME_KEY } from '../app/theme/preferenceStore.mjs';

function luminance(hex) {
  const rgb = hex.slice(1).match(/../g).map(value => parseInt(value, 16) / 255)
    .map(value => value <= 0.04045 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4);
  return rgb[0] * 0.2126 + rgb[1] * 0.7152 + rgb[2] * 0.0722;
}
function contrast(a, b) {
  const values = [luminance(a), luminance(b)].sort((a, b) => b - a);
  return (values[0] + 0.05) / (values[1] + 0.05);
}

test('system preference follows changes; explicit preferences remain stable', () => {
  assert.equal(effectiveScheme('system', 'dark'), 'dark');
  assert.equal(effectiveScheme('system', 'light'), 'light');
  assert.equal(effectiveScheme('system', null), 'light');
  assert.equal(effectiveScheme('dark', 'light'), 'dark');
  assert.equal(effectiveScheme('light', 'dark'), 'light');
});

test('saved preference survives creating a new preference store and invalid data falls back safely', async () => {
  const rows = new Map();
  const storage = { getItem: async key => rows.get(key), setItem: async (key, value) => { rows.set(key, value); } };
  const first = createPreferenceStore(storage);
  assert.equal(await first.load(), 'system');
  await first.save('dark');
  assert.equal(await createPreferenceStore(storage).load(), 'dark');
  await assert.rejects(first.save('invalid'));
  assert.equal(rows.get(THEME_KEY), 'dark');
  rows.set(THEME_KEY, 'invalid');
  assert.equal(await first.load(), 'system');
});

test('rapid choices persist in order and a failed write does not prevent the next choice', async () => {
  let stored = 'system';
  let first = true;
  const storage = {
    getItem: async () => stored,
    setItem: async (key, value) => {
      if (first) { first = false; throw new Error('storage unavailable'); }
      stored = value;
    },
  };
  const preferences = createPreferenceStore(storage);
  await assert.rejects(preferences.save('dark'));
  assert.equal(await preferences.load(), 'system');
  await Promise.all([preferences.save('light'), preferences.save('dark'), preferences.save('system')]);
  assert.equal(await createPreferenceStore(storage).load(), 'system');
});

for (const [name, colors] of Object.entries(PALETTES)) {
  test(`${name} palette keeps text, links, status colors and button labels readable`, () => {
    for (const background of ['background', 'surface', 'selected']) {
      for (const foreground of ['text', 'muted', 'primary', 'danger', 'success']) {
        assert.ok(contrast(colors[background], colors[foreground]) >= 4.5, `${foreground} on ${background}`);
      }
    }
    for (const action of ['actionBlue', 'actionDanger', 'actionGreen']) {
      assert.ok(contrast(colors[action], colors.onAction) >= 4.5, `White icons on ${action}`);
    }
  });
}
