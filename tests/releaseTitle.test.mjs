import test from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { isConventionalTitle } from '../scripts/check-pr-title.mjs';

test('release titles accept features, fixes, breaking changes and release PRs', () => {
  for (const title of ['feat: add offline flights', 'fix(sync): retry uploads', 'feat!: change API', 'fix(api)!: replace endpoint', 'chore(main): release 0.1.0', 'docs: explain releases']) {
    assert.equal(isConventionalTitle(title), true, title);
  }
});

test('uncategorized, empty and multiline titles cannot silently bypass versioning', () => {
  for (const title of [undefined, '', 'Add a feature', 'Fix: repair sync', 'fix:', 'fix:  ', 'feat(scope with spaces): add feature', 'fix: one\nfeat: two']) {
    assert.equal(isConventionalTitle(title), false, String(title));
  }
});

test('the title CLI returns a failure for an invalid title and treats shell syntax as data', () => {
  const script = new URL('../scripts/check-pr-title.mjs', import.meta.url);
  const run = title => spawnSync(process.execPath, [script.pathname], {
    env: { ...process.env, PR_TITLE: title }, encoding: 'utf8',
  });
  assert.equal(run('Fix an issue').status, 1);
  assert.equal(run('fix: display `$(literal)` in remarks').status, 0);
});
