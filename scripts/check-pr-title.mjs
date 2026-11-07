import { pathToFileURL } from 'node:url';

export function isConventionalTitle(title) {
  return typeof title === 'string' && !/[\r\n]/.test(title) &&
    /^(feat|fix|perf|refactor|docs|style|test|build|ci|chore|revert)(\([^()\s]+\))?!?: \S.*$/.test(title);
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  if (!isConventionalTitle(process.env.PR_TITLE)) {
    console.error('Use a conventional PR title, such as "fix: correct flight dates" or "feat: add aircraft defaults".');
    process.exitCode = 1;
  } else {
    console.log('PR title is ready for release versioning.');
  }
}
