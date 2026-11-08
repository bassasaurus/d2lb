# Automated screen tests

These Maestro flows drive the actual Android app in Expo Go against the real
Django API. They complement `npm test` (the fast logic/storage tests).

The default suite runs two independent scenarios, each with a fresh database and
fresh Expo Go data on the dedicated emulator:

- **Flight CRUD:** sign in, create offline, restart, reconnect, refresh, discard an
  edit, update offline, restart, reconnect, cancel a deletion, delete offline,
  restart, reconnect and refresh. Checks verify the original values while offline,
  the changed values after sync, and the same server flight ID through creation,
  update and deletion. Discarding an edit must also remove its unfinished draft.
  After saving an edit, Back must return to the list without reopening the form.
- **Flight validation:** fill the required fields, clear a required route/duration,
  enter excess decimal precision, remove the primary role, and test Solo's landing
  requirement. Then actually save/sync a flight while the advisory “Night Time
  Required” warning is displayed. Finally save night time without a night landing.

Server checkpoints assert exact flight/receipt counts, ownership, aircraft,
tailnumber, route, duration, remarks, role, landings and night time. For CRUD, the
receipt count progresses from one create to one update to one delete; refreshing
must not add extra operations or resurrect the flight.

No mocked login, bypass endpoints, production credentials, or changes to the
Django application are needed. The fixtures use an `example.invalid` account.

## Manual GitHub Actions workflow

After `.github/workflows/screen-tests.yml` is merged into `main`, open the mobile
repository's **Actions → Android screen tests (manual) → Run workflow**.

- Choose the mobile branch to test (normally `main`).
- Leave **scenario** set to `all` for CRUD, validation, and sync recovery, or choose a focused run.
- Leave **django_ref** as `master` to test the current backend. A Django branch,
  tag, or exact commit SHA can be selected for compatibility checks.

The workflow is manual only. It does not run on pull requests or pushes, and it
does not deploy either application. GitHub requires the workflow file to exist
on the default branch before the Run workflow button is available.

The Ubuntu runner checks out both repositories, starts PostgreSQL 16 and a
dedicated Pixel 7/API 34 x86_64 emulator, and runs the same screen scenarios
against a temporary Django API. Django's repository is public, so no additional
GitHub token or production secret is needed. The database password in the
workflow belongs only to its disposable PostgreSQL service.

The job summary records both commit SHAs and the selected scenario. Download the
`android-screen-tests-<run-id>-<attempt>` artifact for screenshots, JUnit results,
the test terminal output, Android logcat, and Django/Metro/migration logs. These
artifacts are retained for seven days, including after failures. The workflow
has a 45-minute timeout and queues runs for the same mobile branch.

Equivalent CLI command after merge:

```sh
gh workflow run screen-tests.yml --ref main -f scenario=all -f django_ref=master
```

`e2e/ci-tools.json` pins Maestro and the SDK-compatible Expo Go APK, including
SHA-256 hashes from their official GitHub releases. `install_tools.py` verifies
each download and fails early when the project's Expo SDK no longer matches.
When upgrading Expo, update these pins and verify the new APK with the screen
scenarios. GitHub Actions themselves are pinned to commit SHAs.

The small Python tests for the downloader, database URL and CI failure handling
run in the normal PR checks too; emulator execution remains manual.

## Manual iOS screen tests

Create and boot a dedicated iPhone simulator named `D2LB_iOS_Screen_Tests`
in Xcode. Get its UDID with `xcrun simctl list devices booted`. This runner
clears Expo Go and the keychain on that simulator so each run starts signed out.
Use a simulator reserved for testing.

With the existing Node, Python, PostgreSQL, and Maestro prerequisites installed,
run this from the mobile repository. Use your simulator's UDID and the matching
Expo Go simulator bundle.

```sh
./scripts/mobile run test:screens:ios -- \
  --ios-simulator YOUR_SIMULATOR_UDID \
  --maestro "$HOME/Documents/Codex/tools/maestro-2.12.1/maestro/bin/maestro" \
  --expo-app "$HOME/.expo/ios-simulator-app-cache/Expo-Go-58.0.7.tar.app"
```

The smoke test signs in with the disposable account, saves a flight using the
iOS date picker, verifies that it appears in the logbook, and checks that Django
stored exactly one matching flight and sync receipt. The runner starts the
temporary API and Metro on ports 8010 and 8082 by default. Reports and
screenshots go under `.screen-tests/<run-id>/`.

Run the offline scenario with the same arguments:

```sh
./scripts/mobile run test:screens:ios:offline -- \
  --ios-simulator YOUR_SIMULATOR_UDID \
  --maestro "$HOME/Documents/Codex/tools/maestro-2.12.1/maestro/bin/maestro" \
  --expo-app "$HOME/.expo/ios-simulator-app-cache/Expo-Go-58.0.7.tar.app"
```

The runner stops its disposable Django API while leaving Metro reachable.
The flight must appear after a full app restart while Django still has no
flight or receipt. Once the API returns, the test waits for automatic sync
before pulling to refresh and verifies that Django still has exactly one
flight and one receipt. This exercises API unavailability and automatic retry.
The simulator's network settings stay as they are.

Run the lost acknowledgment scenario with the same simulator arguments and
`test:screens:ios:retry`. After Django saves the flight, the test server closes
the connection without sending the acknowledgment body. The scenario waits
for the app to retry and checks that Django returns the same operation and
flight IDs and still has one flight and one receipt. The two responses are
recorded in `flight-sync-trace.jsonl` in the run's artifact directory.

Run the keep-server conflict scenario with the same simulator arguments and
`test:screens:ios:conflict`. The iPhone changes the flight to 2.3 hours while
the API is offline. The runner sets the same flight to 3.4 hours in the
disposable database before bringing the API back. The scenario opens the
comparison from Settings, selects **Saved online**, and checks that the
logbook shows 3.4 hours and Django still has one flight and one sync receipt.

Use `test:screens:ios:conflict:device` with the same arguments to select **On
this device** in the comparison. The test checks that the issue clears and
that the existing Django flight changes to 2.3 hours. Django must retain the
original flight ID with one flight and two receipts, one for creation and one
for the accepted update.

## Local Android prerequisites

- Project dependencies (`npm ci`) and the Node version in `.nvmrc`.
- A local Django checkout and its Python environment with requirements installed.
- Local PostgreSQL and a role allowed to create databases.
- Android SDK, an installed system image, and an Expo Go APK matching this
  project's Expo SDK (currently SDK 58).
- [Maestro CLI](https://docs.maestro.dev/maestro-cli/how-to-install-maestro-cli)
  (tested with 2.12.1) and Java 17+.

Create a **separate** emulator named `D2LB_Screen_Tests`. The runner rejects any
other device name, including the everyday Pixel. Example on Apple Silicon:

```sh
mkdir -p "$HOME/Documents/Codex/mobile-e2e/avd"
export ANDROID_AVD_HOME="$HOME/Documents/Codex/mobile-e2e/avd"
export JAVA_HOME="/Applications/Android Studio.app/Contents/jbr/Contents/Home"
printf 'no\n' | "$HOME/Library/Android/sdk/cmdline-tools/latest/bin/avdmanager" \
  create avd -n D2LB_Screen_Tests \
  -k 'system-images;android-34;google_apis;arm64-v8a' -d pixel_7
"$HOME/Library/Android/sdk/emulator/emulator" -avd D2LB_Screen_Tests \
  -port 5556 -no-audio -no-snapshot -gpu swiftshader -memory 2048
```

The chosen system image must already be installed. Use the SDK's matching host
architecture on Intel/Linux. Leave the dedicated emulator open on its home screen.

## Run

From the mobile repository, in another terminal:

```sh
./scripts/mobile run test:screens:android -- \
  --maestro "$HOME/Documents/Codex/tools/maestro-2.12.1/maestro/bin/maestro" \
  --expo-apk "$HOME/.expo/android-apk-cache/Expo-Go-58.0.5.apk"
```

Use your installed Maestro path, or omit `--maestro` if it is on `PATH`. The wrapper
uses `.local-node-path` when present. Python defaults to
`~/.virtualenvs/logbook312/bin/python`; override with `D2LB_DJANGO_PYTHON`.
`--django` defaults to `~/django/direct2logbook`. `--help` lists port/SDK/DB options.
The default local PostgreSQL user is the OS username; use `--pg-user` if different.
For password authentication, supply `PGPASSWORD` in the environment; it is used
by both database administration and Django. `--pg-port` defaults to 5432.
Use `--scenario flight-crud` or `--scenario flight-validation` for a focused run.
`--scenario offline-flight` retains the original, shorter create/restart/sync test.

Use `--scenario sync-recovery` to run the three Android recovery tests together.
To run one, select `android-sync-lost-response`, `android-keep-server-conflict`,
or `android-keep-device-conflict`. The manual GitHub workflow offers the same
choices, and `all` includes all three. Each test checks that Django has one
flight with its original ID. A lost acknowledgment and **Saved online** leave
one sync receipt. **On this device** adds a receipt for the accepted update.


The runner:

1. Refuses occupied API/Metro ports and verifies the dedicated emulator's name.
2. Installs/resets Expo Go **on that emulator only**.
3. Creates a randomly named `d2lb_e2e_*` PostgreSQL database on `127.0.0.1`.
4. Applies Django migrations and seeds the disposable fixtures.
5. Starts an isolated API on port 8010 and Metro on 8082, ignoring the app's `.env`.
6. Runs the selected screen scenario and its server assertions.
7. Restores emulator connectivity, stops its app and the servers it started, and
   drops only the database it created, including on ordinary failure/Ctrl-C.

Each scenario runs in one Maestro session so the app stays in the foreground
when connectivity returns. A temporary host-only checkpoint listener validates
database state between phases; it is part of the test runner, not the Django API,
and accepts only the ordered checkpoints for that run. A deleted flight has no
row with a Synced indicator, so the deletion checkpoint polls only the server
assertion for up to 60 seconds, without repeating the user's delete action.

Maestro reports, screenshots, and server logs are retained in
`.screen-tests/<run-id>/` (gitignored). The emulator stays open for the next run.
An uncatchable process kill or machine crash can interrupt cleanup; inspect the
run ID before removing any leftover `d2lb_e2e_<run-id>` database.

## Offline behavior and scope

The API uses `10.0.2.2`, while Metro uses an ADB reverse connection to emulator
loopback. This keeps JavaScript available when the app restarts in airplane mode,
without giving the app access to the API. Server assertions verify that offline
saves/deletions have not reached Django. Reconnection checks happen before any
manual refresh, testing automatic reconnection sync.

The Android suite runs locally or through the manual GitHub workflow. The iOS
scenarios run manually on a Mac. Installed production builds, Google authentication,
signature capture, and aircraft/tailnumber screen tests are separate follow-ups.

Keep selectors on stable `testID`/accessibility labels. Avoid fixed tap coordinates
for form controls and fixed sleeps; wait for observable UI or database conditions.
