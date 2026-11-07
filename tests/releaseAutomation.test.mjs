import test from 'node:test';
import assert from 'node:assert/strict';
import { Buffer } from 'node:buffer';
import { findReleaseCandidate, mergeCheckedRelease, releaseBranch, validateReleaseChanges,
  validateReleaseMetadata } from '../scripts/release-pr.mjs';

function fixture() {
  const context = { repo: { owner: 'example', repo: 'app' }, sha: 'a'.repeat(40) };
  const expectedHead = 'b'.repeat(40);
  const repository = 'example/app';
  const pr = {
    number: 49, state: 'open', draft: false, title: 'chore(main): release 0.1.0', body: 'Release notes',
    user: { login: 'github-actions[bot]', type: 'Bot' }, labels: [{ name: 'autorelease: pending' }],
    head: { ref: releaseBranch, sha: expectedHead, repo: { full_name: repository } },
    base: { ref: 'main', repo: { full_name: repository } },
  };
  const documents = version => ({
    'package.json': { name: 'app', version, scripts: { test: 'node --test' }, dependencies: { expo: '58.0.23' } },
    'package-lock.json': { version, packages: { '': { name: 'app', version }, 'node_modules/expo': { version: '58.0.23' } } },
    '.release-please-manifest.json': { '.': version },
  });
  const before = documents('0.0.1');
  const after = documents('0.1.0');
  const files = ['package.json', 'package-lock.json', '.release-please-manifest.json', 'CHANGELOG.md']
    .map(filename => ({ filename, status: 'modified' }));
  const state = { main: context.sha, prs: [pr], merges: [], mainReads: 0 };
  const github = {
    rest: {
      git: { getRef: async () => {
        state.mainReads += 1;
        if (state.advanceBeforeMerge && state.mainReads === 2) state.main = 'c'.repeat(40);
        return { data: { object: { sha: state.main } } };
      } },
      pulls: {
        list: async () => ({ data: state.prs }), get: async () => ({ data: pr }),
        listFiles: () => {},
        merge: async request => { state.merges.push(request); return { data: { merged: true } }; },
      },
      repos: { getContent: async ({ path, ref }) => {
        assert.ok([context.sha, expectedHead].includes(ref));
        return { data: { encoding: 'base64', content: Buffer.from(JSON.stringify(
          (ref === context.sha ? before : after)[path])).toString('base64') } };
      } },
    },
    paginate: async () => files,
  };
  return { github, context, number: pr.number, expectedHead, checksResult: 'success', pr, repository, before, after, files, state };
}

test('unchanged existing release PRs are discovered on a retry without action outputs', async () => {
  const f = fixture();
  assert.equal((await findReleaseCandidate(f)).head.sha, f.expectedHead);
  assert.equal(f.state.merges.length, 0);
});

test('successful checks merge only the validated exact commit with a squash merge', async () => {
  const f = fixture();
  assert.equal(await mergeCheckedRelease(f), true);
  assert.deepEqual(f.state.merges, [{ ...f.context.repo, pull_number: 49, sha: f.expectedHead,
    merge_method: 'squash', commit_title: 'chore(main): release 0.1.0 (#49)', commit_message: 'Release notes' }]);
});

test('failed, cancelled, skipped or missing checks never merge a release', async () => {
  for (const checksResult of ['failure', 'cancelled', 'skipped', undefined]) {
    const f = fixture();
    await assert.rejects(mergeCheckedRelease({ ...f, checksResult }), /checks must pass/);
    assert.equal(f.state.merges.length, 0);
  }
});

test('an absent checked SHA cannot authorize a merge', async () => {
  const f = fixture();
  await assert.rejects(mergeCheckedRelease({ ...f, expectedHead: '' }), /checked commit/);
  assert.equal(f.state.merges.length, 0);
});

for (const [name, change] of [
  ['a human-authored PR', f => { f.pr.user = { login: 'maintainer', type: 'User' }; }],
  ['a fork', f => { f.pr.head.repo.full_name = 'someone/app'; }],
  ['another base repository', f => { f.pr.base.repo.full_name = 'someone/app'; }],
  ['an ordinary feature branch', f => { f.pr.head.ref = 'feat/example'; }],
  ['another base branch', f => { f.pr.base.ref = 'preview'; }],
  ['a draft', f => { f.pr.draft = true; }],
  ['a PR without the release label', f => { f.pr.labels = []; }],
]) {
  test(`automatic release validation rejects ${name}`, async () => {
    const f = fixture(); change(f);
    assert.throws(() => validateReleaseMetadata(f.pr, f.repository));
    await assert.rejects(mergeCheckedRelease(f));
    assert.equal(f.state.merges.length, 0);
  });
}

for (const [name, change] of [
  ['an extra code file', f => { f.files.push({ filename: 'App.js', status: 'modified' }); }],
  ['a renamed release file', f => { f.files[0].status = 'renamed'; }],
  ['a changed npm script', f => { f.after['package.json'].scripts.test = 'echo bypassed'; }],
  ['a dependency change', f => { f.after['package.json'].dependencies.expo = '99.0.0'; }],
  ['a lockfile dependency change', f => { f.after['package-lock.json'].packages['node_modules/expo'].version = '99.0.0'; }],
  ['a mismatched lockfile version', f => { f.after['package-lock.json'].packages[''].version = '0.0.1'; }],
  ['a mismatched manifest version', f => { f.after['.release-please-manifest.json']['.'] = '0.2.0'; }],
  ['an unchanged version', f => { f.after['package.json'].version = '0.0.1'; }],
  ['a lower version', f => { f.after['package.json'].version = '0.0.0'; }],
  ['a misleading release title', f => { f.pr.title = 'feat: add something else'; }],
]) {
  test(`automatic release validation rejects ${name}`, async () => {
    const f = fixture(); change(f);
    assert.throws(() => validateReleaseChanges(f.pr, f.files, f.before, f.after));
    await assert.rejects(mergeCheckedRelease(f));
    assert.equal(f.state.merges.length, 0);
  });
}

test('new changelogs are accepted along with version-only changes', () => {
  const f = fixture();
  f.files.find(file => file.filename === 'CHANGELOG.md').status = 'added';
  validateReleaseChanges(f.pr, f.files, f.before, f.after);
});

test('a changed release head cannot reuse a previous passing check', async () => {
  const f = fixture(); f.pr.head.sha = 'c'.repeat(40);
  assert.equal(await mergeCheckedRelease(f), false);
  assert.equal(f.state.merges.length, 0);
});

test('a newer main commit defers preparation and merging to a new workflow', async () => {
  const f = fixture(); f.state.main = 'c'.repeat(40);
  assert.equal(await findReleaseCandidate(f), null);
  assert.equal(await mergeCheckedRelease(f), false);
  assert.equal(f.state.merges.length, 0);
});

test('main is checked again after inspecting the release files', async () => {
  const f = fixture(); f.state.advanceBeforeMerge = true;
  assert.equal(await mergeCheckedRelease(f), false);
  assert.equal(f.state.merges.length, 0);
});

test('a closed release PR and an empty release queue are safe no-ops', async () => {
  const f = fixture(); f.pr.state = 'closed';
  assert.equal(await mergeCheckedRelease(f), false);
  f.state.prs = [];
  assert.equal(await findReleaseCandidate(f), null);
  assert.equal(f.state.merges.length, 0);
});
