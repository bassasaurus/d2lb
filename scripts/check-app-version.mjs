import assert from 'node:assert/strict';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const pkg = require('../package.json');
const lock = require('../package-lock.json');
const manifest = require('../.release-please-manifest.json');
const app = require('../app.json');
const configure = require('../app.config.js');
const eas = require('../eas.json');

assert.match(pkg.version, /^\d+\.\d+\.\d+$/, 'Use a stable major.minor.patch app version');
assert.equal(lock.version, pkg.version, 'The lockfile version must match package.json');
assert.equal(lock.packages[''].version, pkg.version, 'The root lockfile package version must match');
assert.equal(manifest['.'], pkg.version, 'Release Please must track the current app version');
assert.equal(app.expo.version, undefined, 'Keep the app version in package.json only');
assert.deepEqual(configure({ config: app.expo }), { ...app.expo, version: pkg.version });
assert.equal(eas.cli.appVersionSource, 'remote', 'EAS manages native build numbers');
assert.equal(eas.build.production.autoIncrement, true, 'Production builds must increment their build number');
console.log(`App version ${pkg.version}: Expo config, lockfile, release manifest and EAS settings agree.`);
