import { spawnSync } from 'node:child_process';
import { sentryBuildEnvironment } from './sentry-build-env.mjs';

const [command, ...args] = process.argv.slice(2);
if (!command) {
  console.error('Usage: scripts/with-sentry <build command> [arguments]');
  process.exit(2);
}
try {
  const env = sentryBuildEnvironment();
  console.log('Sentry build credentials loaded; source-map uploads are required.');
  const result = spawnSync(command, args, { env, stdio: 'inherit' });
  if (result.error) throw new Error('Could not start the build command.');
  process.exit(result.status ?? 1);
} catch (error) {
  console.error(error.message);
  process.exit(1);
}
