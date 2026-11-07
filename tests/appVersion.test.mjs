import test from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { formatAppVersion } from '../app/settings/appVersion.mjs';

test('Expo Go displays the project version and never the host app version', () => {
  assert.equal(formatAppVersion({
    projectVersion: '0.1.0', nativeVersion: '58.0.2', buildVersion: '123', expoGo: true,
  }), '0.1.0 (Development)');
});

test('installed apps display their actual native version and build, even if the JS config differs', () => {
  assert.equal(formatAppVersion({
    projectVersion: '0.2.0', nativeVersion: '0.1.0', buildVersion: '42', expoGo: false,
  }), '0.1.0 (Build 42)');
});

test('development clients identify the native build and development mode', () => {
  assert.equal(formatAppVersion({
    projectVersion: '0.2.0', nativeVersion: '0.1.0', buildVersion: '12', development: true,
  }), '0.1.0 (Build 12, Development)');
});

test('missing native metadata falls back without inventing a build number', () => {
  assert.equal(formatAppVersion({ projectVersion: '0.1.0', nativeVersion: null, buildVersion: null }), '0.1.0');
  assert.equal(formatAppVersion({ expoGo: true }), 'Unavailable (Development)');
  assert.equal(formatAppVersion({}), 'Unavailable');
});

test('dynamic Expo configuration preserves settings and overrides any stale version', () => {
  const require = createRequire(import.meta.url);
  const configure = require('../app.config.js');
  const pkg = require('../package.json');
  const config = { name: 'Example', version: '99.0.0', plugins: ['example'], ios: { bundleIdentifier: 'example.app' } };
  assert.deepEqual(configure({ config }), { ...config, version: pkg.version });
  assert.equal(config.version, '99.0.0');
});
