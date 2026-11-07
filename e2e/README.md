# Automated screen tests

These Maestro flows drive the actual Android app in Expo Go against the real
Django API. They complement `npm test` (the fast logic/storage tests).

The first scenario signs in, downloads reference data, switches offline, creates
a flight, stops/reopens the app, reconnects, and pulls to refresh. At checkpoints,
the runner checks the disposable PostgreSQL database: zero flights/receipts while
offline and exactly one flight/receipt after reconnecting and refreshing. It also
checks the saved aircraft, tailnumber, route, duration, role, and date.

No mocked login, bypass endpoints, production credentials, or changes to the
Django application are needed. The fixtures use an `example.invalid` account.

## One-time prerequisites

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

The runner:

1. Refuses occupied API/Metro ports and verifies the dedicated emulator's name.
2. Installs/resets Expo Go **on that emulator only**.
3. Creates a randomly named `d2lb_e2e_*` PostgreSQL database on `127.0.0.1`.
4. Applies Django migrations and seeds the disposable fixtures.
5. Starts an isolated API on port 8010 and Metro on 8082, ignoring the app's `.env`.
6. Runs the five screen flows and server assertions.
7. Restores emulator connectivity, stops its app and the servers it started, and
   drops only the database it created, including on ordinary failure/Ctrl-C.

The five phases run in one Maestro session so the app stays in the foreground
when connectivity returns. A temporary host-only checkpoint listener validates
database state between phases; it is part of the test runner, not the Django API,
and accepts only the ordered checkpoints for that run.

Maestro reports, screenshots, and server logs are retained in
`.screen-tests/<run-id>/` (gitignored). The emulator stays open for the next run.
An uncatchable process kill or machine crash can interrupt cleanup; inspect the
run ID before removing any leftover `d2lb_e2e_<run-id>` database.

## Offline behavior and scope

The API uses `10.0.2.2`, while Metro uses an ADB reverse connection to emulator
loopback. This keeps JavaScript available when the app restarts in airplane mode,
without giving the app access to the API. The zero-record assertions verify that
the offline save has not reached Django. The reconnect flow waits for `Synced`
before any manual refresh, testing automatic reconnection sync.

This first suite is **Android/local only**, not yet a required GitHub Actions
check. iOS screen tests, installed production builds, Google authentication,
signature capture, and additional CRUD/validation scenarios are separate follow-up
coverage. The normal PR lint/unit/export workflow remains in place.

Keep selectors on stable `testID`/accessibility labels. Avoid fixed tap coordinates
for form controls and fixed sleeps; wait for observable UI or database conditions.
