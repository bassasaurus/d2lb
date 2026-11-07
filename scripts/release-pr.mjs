import assert from 'node:assert/strict';
import { Buffer } from 'node:buffer';

export const releaseBranch = 'release-please--branches--main--components--d2lb';
const releaseFiles = ['.release-please-manifest.json', 'CHANGELOG.md', 'package-lock.json', 'package.json'];

export function validateReleaseMetadata(pr, repository) {
  assert.equal(pr.user?.login, 'github-actions[bot]', 'Only the release bot may create an automatic release');
  assert.equal(pr.user?.type, 'Bot');
  assert.equal(pr.head.repo?.full_name, repository, 'The release must belong to this repository');
  assert.equal(pr.base.repo?.full_name, repository);
  assert.equal(pr.head.ref, releaseBranch);
  assert.equal(pr.base.ref, 'main');
  assert.equal(pr.draft, false);
  assert.ok(pr.labels.some(label => label.name === 'autorelease: pending'), 'Missing pending release label');
}

function withoutVersion(document, lockfile = false) {
  const copy = JSON.parse(JSON.stringify(document));
  delete copy.version;
  if (lockfile) delete copy.packages[''].version;
  return copy;
}

function versionParts(version) {
  assert.match(version, /^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)$/, 'Expected a stable app version');
  return version.split('.').map(value => BigInt(value));
}

export function validateReleaseChanges(pr, files, before, after) {
  assert.deepEqual(files.map(file => file.filename).sort(), releaseFiles, 'Unexpected files in release PR');
  assert.ok(files.every(file => file.status === 'modified' ||
    (file.filename === 'CHANGELOG.md' && file.status === 'added')), 'Release files cannot be removed or renamed');
  const oldVersion = before['package.json'].version;
  const version = after['package.json'].version;
  const previous = versionParts(oldVersion);
  const next = versionParts(version);
  const changed = next.findIndex((part, index) => part !== previous[index]);
  assert.ok(changed >= 0 && next[changed] > previous[changed], 'Release version must increase');
  assert.equal(pr.title, `chore(main): release ${version}`);
  assert.deepEqual(withoutVersion(after['package.json']), withoutVersion(before['package.json']),
    'Release cannot change package scripts or dependencies');
  assert.equal(after['package-lock.json'].version, version);
  assert.equal(after['package-lock.json'].packages[''].version, version);
  assert.deepEqual(withoutVersion(after['package-lock.json'], true), withoutVersion(before['package-lock.json'], true),
    'Release cannot change locked dependencies');
  assert.deepEqual(before['.release-please-manifest.json'], { '.': oldVersion });
  assert.deepEqual(after['.release-please-manifest.json'], { '.': version });
}

async function mainIsCurrent({ github, context }) {
  const { data } = await github.rest.git.getRef({ ...context.repo, ref: 'heads/main' });
  return data.object.sha === context.sha;
}

async function inspectRelease({ github, context, number, expectedHead }) {
  const { data: pr } = await github.rest.pulls.get({ ...context.repo, pull_number: number });
  if (pr.state !== 'open' || (expectedHead && pr.head.sha !== expectedHead)) return null;
  if (!(await mainIsCurrent({ github, context }))) return null;
  validateReleaseMetadata(pr, `${context.repo.owner}/${context.repo.repo}`);
  const files = await github.paginate(github.rest.pulls.listFiles, { ...context.repo, pull_number: number });
  const documents = await Promise.all([context.sha, pr.head.sha].map(async ref => {
    const entries = await Promise.all(releaseFiles.filter(file => file !== 'CHANGELOG.md').map(async path => {
      const { data } = await github.rest.repos.getContent({ ...context.repo, path, ref });
      assert.equal(data.encoding, 'base64');
      return [path, JSON.parse(Buffer.from(data.content, 'base64').toString('utf8'))];
    }));
    return Object.fromEntries(entries);
  }));
  validateReleaseChanges(pr, files, ...documents);
  return pr;
}

export async function findReleaseCandidate({ github, context }) {
  if (!(await mainIsCurrent({ github, context }))) return null;
  const { data: prs } = await github.rest.pulls.list({
    ...context.repo, state: 'open', base: 'main', head: `${context.repo.owner}:${releaseBranch}`,
  });
  if (!prs.length) return null;
  assert.equal(prs.length, 1, 'Expected one pending release');
  return inspectRelease({ github, context, number: prs[0].number });
}

export async function mergeCheckedRelease({ github, context, number, expectedHead, checksResult }) {
  assert.equal(checksResult, 'success', 'Release checks must pass before merging');
  assert.match(expectedHead, /^[a-f0-9]{40}$/, 'The checked commit must be specified');
  const pr = await inspectRelease({ github, context, number, expectedHead });
  if (!pr || !(await mainIsCurrent({ github, context }))) return false;
  const { data } = await github.rest.pulls.merge({
    ...context.repo, pull_number: number, sha: expectedHead, merge_method: 'squash',
    commit_title: `${pr.title} (#${number})`, commit_message: pr.body,
  });
  assert.equal(data.merged, true, 'GitHub did not merge the release');
  return true;
}
