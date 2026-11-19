import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';
import { nativeCrashConfiguration } from '../app/monitoring/nativeCrash.mjs';

test('installed Android builds recover historical native aborts on next launch', () => {
  assert.deepEqual(nativeCrashConfiguration('android', true), {
    enableNativeCrashHandling: true, enableNdk: true, enableNdkScopeSync: true,
    enableTombstone: true, enableHistoricalTombstoneReporting: true,
  });
});
test('development keeps native crash collection disabled', () => {
  for (const value of Object.values(nativeCrashConfiguration('android', false))) assert.equal(value, false);
});
test('iOS uses its native handler without Android-only options', () => {
  assert.deepEqual(nativeCrashConfiguration('ios', true), { enableNativeCrashHandling: true });
});
test('OCR library publishes ONNX JNI keep rules to minified consumers', () => {
  const root = new URL('../modules/tailnumber-ocr/android/', import.meta.url);
  assert.match(readFileSync(new URL('build.gradle', root), 'utf8'), /consumerProguardFiles 'consumer-rules.pro'/);
  assert.match(readFileSync(new URL('consumer-rules.pro', root), 'utf8'), /-keep class ai\.onnxruntime\.\*\* \{ \*; \}/);
});
