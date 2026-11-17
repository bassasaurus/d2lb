import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, writeFileSync, chmodSync, rmSync, symlinkSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { sentryBuildEnvironment } from '../scripts/sentry-build-env.mjs';

function fixture(t, text = "export SENTRY_AUTH_TOKEN='test_build_token_123'\n") {
  const dir = mkdtempSync(join(tmpdir(), 'sentry-build-test-'));
  t.after(() => rmSync(dir, { recursive: true, force: true }));
  const file = join(dir, 'credentials.env');
  writeFileSync(file, text, { mode: 0o600 });
  return { dir, file };
}

test('private build token enables required uploads and preserves other build settings', t => {
  const { file } = fixture(t);
  const env = sentryBuildEnvironment(file, { PATH: '/usr/bin', SENTRY_DISABLE_AUTO_UPLOAD: 'true', SENTRY_ALLOW_FAILURE: 'true' });
  assert.equal(env.SENTRY_AUTH_TOKEN, 'test_build_token_123');
  assert.equal(env.PATH, '/usr/bin');
  assert.equal(env.SENTRY_DISABLE_AUTO_UPLOAD, 'false');
  assert.equal(env.SENTRY_ALLOW_FAILURE, 'false');
  assert.equal(env.SENTRY_ORG, 'direct2logbook');
  assert.equal(env.SENTRY_PROJECT, 'd2lb_mobile');
  assert.equal(env.SENTRY_URL, 'https://sentry.io/');
  assert.equal(env.EXPO_PUBLIC_SENTRY_AUTH_TOKEN, undefined);
});

test('missing, public, or symlinked credential files are rejected', t => {
  const { dir, file } = fixture(t);
  assert.throws(() => sentryBuildEnvironment(join(dir, 'missing'), {}), /missing/);
  chmodSync(file, 0o644);
  assert.throws(() => sentryBuildEnvironment(file, {}), /permissions 600/);
  chmodSync(file, 0o600);
  const link = join(dir, 'link');
  symlinkSync(file, link);
  assert.throws(() => sentryBuildEnvironment(link, {}), /regular file/);
});

test('shell expressions and additional commands are rejected without exposing their contents', t => {
  for (const text of ["export SENTRY_AUTH_TOKEN='$(touch should-not-exist)'", 'SENTRY_AUTH_TOKEN=test_token\necho unsafe', 'SENTRY_AUTH_TOKEN=PASTE_YOUR_NEW_TOKEN_HERE']) {
    const { file } = fixture(t, text);
    assert.throws(() => sentryBuildEnvironment(file, {}), error => {
      assert.equal(error.message.includes(text), false);
      return /one SENTRY_AUTH_TOKEN assignment/.test(error.message);
    });
  }
});

test('a publicly prefixed token variable prevents the build', t => {
  const { file } = fixture(t);
  assert.throws(() => sentryBuildEnvironment(file, { EXPO_PUBLIC_SENTRY_AUTH_TOKEN: 'bad_public_setting' }), /public Sentry token/);
});

test('quoted or unquoted assignments are read as data without shell expansion', t => {
  for (const text of ['SENTRY_AUTH_TOKEN=test_token_123', 'export SENTRY_AUTH_TOKEN="test_token_123"', "# local credential\nexport SENTRY_AUTH_TOKEN='test_token_123'\n"]) {
    const { file } = fixture(t, text);
    assert.equal(sentryBuildEnvironment(file, {}).SENTRY_AUTH_TOKEN, 'test_token_123');
  }
});
