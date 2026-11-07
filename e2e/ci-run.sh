#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/.."

# This wrapper is only for the ephemeral GitHub-hosted runner.
: "${RUNNER_TEMP:?Run this wrapper in GitHub Actions; use scripts/screen-tests locally.}"
: "${ANDROID_HOME:?Android SDK is required}"
: "${SCREEN_TEST_SCENARIO:?Select a screen scenario}"
mkdir -p .screen-tests
adb_bin="$ANDROID_HOME/platform-tools/adb"

capture_android_logs() {
  "$adb_bin" -s emulator-5556 logcat -d -t 5000 > .screen-tests/android-logcat.txt 2>&1 || true
}
trap capture_android_logs EXIT
"$adb_bin" -s emulator-5556 logcat -c

# pipefail preserves a failing test's exit code while retaining its terminal log.
"$RUNNER_TEMP/screen-test-backend/bin/python" -u e2e/run.py \
  --django "$PWD/.screen-test-backend" \
  --maestro "$RUNNER_TEMP/screen-test-tools/maestro/bin/maestro" \
  --expo-apk "$RUNNER_TEMP/screen-test-tools/expo-go.apk" \
  --pg-user postgres --emulator-port 5556 \
  --scenario "$SCREEN_TEST_SCENARIO" 2>&1 | tee .screen-tests/terminal.log
