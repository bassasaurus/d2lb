import { readFileSync, lstatSync } from 'node:fs';
import { homedir } from 'node:os';
import { join } from 'node:path';

export function sentryBuildEnvironment(file = join(homedir(), '.config/direct2logbook/sentry-build.env'), env = process.env) {
  let info;
  try { info = lstatSync(file); }
  catch { throw new Error('Sentry credential file is missing. Save it in ~/.config/direct2logbook/sentry-build.env.'); }
  if (!info.isFile() || (info.mode & 0o077) || (process.getuid && info.uid !== process.getuid())) {
    throw new Error('Sentry credential file must be owned by you, be a regular file, and have permissions 600.');
  }
  const lines = readFileSync(file, 'utf8').split(/\r?\n/).map(line => line.trim()).filter(line => line && !line.startsWith('#'));
  // Parse the one supported assignment as data, never execute this private file.
  const match = lines.length === 1 && lines[0].match(/^(?:export\s+)?SENTRY_AUTH_TOKEN\s*=\s*(?:'([^']*)'|"([^"]*)"|([^\s]+))\s*$/);
  const token = match && (match[1] ?? match[2] ?? match[3]);
  if (!token || !/^[A-Za-z0-9_+/=-]+$/.test(token) || /PASTE|YOUR.*TOKEN/i.test(token)) {
    throw new Error('Sentry credential file must contain one SENTRY_AUTH_TOKEN assignment with the new token.');
  }
  if (Object.keys(env).some(key => key.startsWith('EXPO_PUBLIC_') && /SENTRY.*TOKEN/.test(key))) {
    throw new Error('Remove the public Sentry token environment variable before building.');
  }
  return { ...env, SENTRY_AUTH_TOKEN: token, SENTRY_DISABLE_AUTO_UPLOAD: 'false', SENTRY_ALLOW_FAILURE: 'false',
    SENTRY_ORG: 'direct2logbook', SENTRY_PROJECT: 'd2lb_mobile', SENTRY_URL: 'https://sentry.io/' };
}
