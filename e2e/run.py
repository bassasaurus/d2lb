"""Run mobile screen tests against an isolated, disposable local Django API."""
import argparse
import fcntl
import getpass
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
import json
import os
from pathlib import Path
import plistlib
import shutil
import signal
import socket
import subprocess
import sys
import time
import threading
from urllib.request import urlopen
from urllib.error import HTTPError, URLError
import uuid

from PIL import Image, ImageColor
import psycopg2
from psycopg2 import sql
from scenarios import ANDROID_SYNC_RECOVERY, SCENARIOS
from config import database_url

ROOT = Path(__file__).resolve().parent.parent
AVD = 'D2LB_Screen_Tests'
IOS_SIMULATOR = 'D2LB_iOS_Screen_Tests'
IOS_EXPO_ID = 'host.exp.Exponent'
IOS_SCENARIOS = (
    'ios-flight-smoke', 'ios-offline-flight', 'ios-sync-lost-response',
    'ios-keep-server-conflict', 'ios-keep-device-conflict',
)


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--django', type=Path, default=Path.home() / 'django/direct2logbook')
    parser.add_argument('--maestro', default=shutil.which('maestro'))
    parser.add_argument('--expo-apk', type=Path, help='Android Expo Go APK matching this project SDK')
    parser.add_argument('--ios-simulator', type=uuid.UUID, help='UDID of the booted dedicated iPhone simulator')
    parser.add_argument('--expo-app', type=Path, help='iOS Simulator Expo Go .app matching this project SDK')
    parser.add_argument('--android-sdk', type=Path, default=Path(os.environ.get('ANDROID_HOME', Path.home() / 'Library/Android/sdk')))
    parser.add_argument('--pg-user', default=getpass.getuser())
    parser.add_argument('--pg-port', type=int, default=5432)
    parser.add_argument('--api-port', type=int, default=8010)
    parser.add_argument('--metro-port', type=int, default=8082)
    parser.add_argument('--emulator-port', type=int, default=5556)
    parser.add_argument('--scenario', choices=['all', 'sync-recovery', *SCENARIOS],
                        help='Defaults to all Android scenarios, or the iOS smoke test with --ios-simulator')
    args = parser.parse_args()
    if not args.maestro or not Path(args.maestro).is_file():
        parser.error('Install Maestro and supply --maestro /path/to/maestro (or add it to PATH).')
    if not (args.django / 'logbook/settings_ci.py').is_file():
        parser.error('Supply the Django checkout with settings_ci.py.')
    if args.ios_simulator:
        if sys.platform != 'darwin':
            parser.error('iOS screen tests require macOS and Xcode.')
        if args.expo_apk or args.scenario not in (None, *IOS_SCENARIOS):
            parser.error('Use --expo-app and an iOS scenario with --ios-simulator.')
        if not args.expo_app:
            parser.error('Supply an iOS Simulator Expo Go bundle with --expo-app.')
        try:
            with (args.expo_app / 'Info.plist').open('rb') as info:
                bundle = plistlib.load(info)
        except (OSError, plistlib.InvalidFileException):
            parser.error('Supply an iOS Simulator Expo Go bundle with --expo-app.')
        if (bundle.get('CFBundleIdentifier') != IOS_EXPO_ID
                or 'iPhoneSimulator' not in bundle.get('CFBundleSupportedPlatforms', [])):
            parser.error('--expo-app must be Expo Go built for the iOS Simulator.')
        args.scenario = args.scenario or IOS_SCENARIOS[0]
    else:
        if args.expo_app or args.scenario in IOS_SCENARIOS:
            parser.error('iOS screen tests require --ios-simulator and --expo-app.')
        if not args.expo_apk or not args.expo_apk.is_file():
            parser.error('Supply an existing Android Expo Go APK with --expo-apk.')
        if not 5554 <= args.emulator_port <= 5682 or args.emulator_port % 2:
            parser.error('The emulator port must be an even number from 5554 to 5682.')
        args.scenario = args.scenario or 'all'

    scenarios = {
        'all': ('flight-crud', 'flight-validation', *ANDROID_SYNC_RECOVERY),
        'sync-recovery': ANDROID_SYNC_RECOVERY,
    }.get(args.scenario, (args.scenario,))
    for scenario in scenarios:
        run_scenario(args, scenario)
    print(f'\nPASS: {len(scenarios)}/{len(scenarios)} screen scenarios.', flush=True)


def run_scenario(args, scenario):
    steps = SCENARIOS[scenario]
    ios = args.ios_simulator is not None
    device = str(args.ios_simulator).upper() if ios else f'emulator-{args.emulator_port}'
    api_host = '127.0.0.1' if ios else '10.0.2.2'
    expo_url = f'exp://127.0.0.1:{args.metro_port}'
    if ios:
        # Use the same dev-menu launch switches as Expo CLI's automated launch.
        expo_url += '?__expo_disable_fab=1&__expo_disable_auto_launch=1&__expo_disable_onboarding=1'

    artifacts = ROOT / '.screen-tests'
    artifacts.mkdir(exist_ok=True)
    lock = (artifacts / 'run.lock').open('w')
    fcntl.flock(lock, fcntl.LOCK_EX | fcntl.LOCK_NB)
    run_id = uuid.uuid4().hex[:12]
    output = artifacts / run_id
    output.mkdir()
    print(f'Scenario: {scenario}\nArtifacts: {output}', flush=True)
    env = os.environ.copy()
    env.update(EXPO_NO_DOTENV='1', EXPO_NO_TELEMETRY='1', CI='1',
               EXPO_PUBLIC_API_URL=f'http://{api_host}:{args.api_port}',
               REACT_NATIVE_PACKAGER_HOSTNAME='127.0.0.1',
               MAESTRO_CLI_NO_ANALYTICS='1', MAESTRO_CLI_ANALYSIS_NOTIFICATION_DISABLED='true',
               JAVA_OPTS=f'-Duser.home={artifacts / "maestro-home"}')
    if not env.get('JAVA_HOME') and Path('/Applications/Android Studio.app/Contents/jbr/Contents/Home').exists():
        env['JAVA_HOME'] = '/Applications/Android Studio.app/Contents/jbr/Contents/Home'
    (artifacts / 'maestro-home').mkdir(exist_ok=True)
    if not ios:
        env['ANDROID_HOME'] = str(args.android_sdk)
        env['PATH'] = f'{args.android_sdk / "platform-tools"}:{env["PATH"]}'
    database = 'd2lb_e2e_' + run_id
    env.update(DJANGO_SETTINGS_MODULE='backend_settings',
               DATABASE_URL=database_url(args.pg_user, args.pg_port, database, env.get('PGPASSWORD')),
               PYTHONPATH=os.pathsep.join([str(ROOT / 'e2e'), str(args.django)]),
               PYTHONUNBUFFERED='1')
    trace = output / 'flight-sync-trace.jsonl'
    env.pop('D2LB_FLIGHT_SYNC_TRACE', None)
    if scenario in ('ios-sync-lost-response', 'android-sync-lost-response'):
        env['D2LB_FLIGHT_SYNC_TRACE'] = str(trace)
    adb = [str(args.android_sdk / 'platform-tools/adb'), '-s', device]
    children = []
    logs = []
    created_db = False
    claimed_device = False
    checkpoints = None
    api = None

    def command(argv, **kwargs):
        return subprocess.run([str(x) for x in argv], env=env, cwd=ROOT, check=True, **kwargs)

    def start(argv, log_name, cwd=ROOT):
        log = (output / log_name).open('w')
        logs.append(log)
        process = subprocess.Popen([str(x) for x in argv], cwd=cwd, env=env,
                                   stdout=log, stderr=subprocess.STDOUT, start_new_session=True)
        children.append(process)
        return process

    def stop(process):
        if process.poll() is None:
            os.killpg(process.pid, signal.SIGTERM)
            try:
                process.wait(timeout=10)
            except subprocess.TimeoutExpired:
                os.killpg(process.pid, signal.SIGKILL)
                process.wait()

    def wait_for(label, predicate, timeout=120, process=None):
        deadline = time.monotonic() + timeout
        while time.monotonic() < deadline:
            if process and process.poll() is not None:
                raise RuntimeError(f'{label} exited; inspect {output}')
            if predicate():
                return
            time.sleep(1)
        raise TimeoutError(f'Timed out waiting for {label}; inspect {output}')

    def http_ready(port, path):
        try:
            with urlopen(f'http://127.0.0.1:{port}{path}', timeout=2) as response:
                return response.status == 200
        except HTTPError as error:
            return error.code == 401
        except (URLError, TimeoutError):
            return False

    def start_api(log_name):
        argv = [sys.executable, args.django / 'manage.py', 'runserver',
                f'127.0.0.1:{args.api_port}', '--noreload']
        if scenario in ('ios-sync-lost-response', 'android-sync-lost-response'):
            # Django closes each HTTP connection when its test server runs without threads.
            argv.append('--nothreading')
        process = start(argv, log_name, args.django)
        wait_for('Django', lambda: http_ready(args.api_port, '/api/mobile/session/'), timeout=20, process=process)
        return process

    def set_online(online):
        nonlocal api
        if ios:
            # Keep Metro reachable for the Expo Go restart. Only this run's API goes offline.
            if online:
                api = start_api('django-reconnected.log')
            else:
                stop(api)
        else:
            command(adb + ['shell', 'cmd', 'connectivity', 'airplane-mode', 'disable' if online else 'enable'])
            command(adb + ['shell', 'svc', 'wifi', 'enable' if online else 'disable'])

    def assert_sync_dot(label, expected_colors, step):
        density = command(adb + ['shell', 'wm', 'density'], capture_output=True,
                          text=True, timeout=10).stdout.splitlines()[-1]
        scale = int(density.split()[-1]) / 160
        # The list and card each have 12 dp of left padding. Sample the center
        # of the 7 dp dot so antialiasing and nearby text cannot match it.
        left, right = round(26 * scale), round(29 * scale)
        core_height = round(3 * scale)
        screenshot = output / f'{step}-sync-dot.png'
        screenshot.write_bytes(command(adb + ['exec-out', 'screencap', '-p'],
                                       capture_output=True, timeout=10).stdout)
        with Image.open(screenshot) as image:
            band = image.convert('RGB').crop((left, 0, right, image.height))
        for color in map(ImageColor.getrgb, expected_colors):
            consecutive = 0
            for y in range(band.height):
                row = band.crop((0, y, band.width, y + 1))
                consecutive = consecutive + 1 if row.getcolors() == [(band.width, color)] else 0
                if consecutive >= core_height:
                    print(f'PASS: {label} dot color', flush=True)
                    return
        raise AssertionError(f'{label} dot did not match {expected_colors}. See {screenshot}.')

    def backend(action, **kwargs):
        return command([sys.executable, ROOT / 'e2e/backend.py', action], **kwargs)

    def flow():
        print(f'\nSCREEN TEST: {scenario}', flush=True)
        command([args.maestro, '--device', device, 'test',
                 '--test-output-dir', output, '--debug-output', output,
                 '--format', 'junit', '--output', output / 'screens.xml',
                 '-e', f'EXPO_URL={expo_url}',
                 '-e', f'CHECKPOINT_URL=http://127.0.0.1:{checkpoints.server_port}/{run_id}',
                 ROOT / f'e2e/{scenario}.yaml'], timeout=1200)

    def replay_ready():
        try:
            events = [json.loads(line) for line in trace.read_text().splitlines(keepends=True)
                      if line.endswith('\n')]
        except FileNotFoundError:
            return False
        if len(events) < 2:
            return False
        first, retry = events[:2]
        if len(events) != 2 or not first['dropped'] or retry != {**first, 'dropped': False}:
            raise AssertionError(f'Expected one dropped acknowledgment and one replay of the same flight: {events}')
        return True

    completed = []

    class Checkpoint(BaseHTTPRequestHandler):
        def log_message(self, *_args):
            pass

        def retry_later(self, detail):
            time.sleep(0.5)
            self.send_response(202)
            self.end_headers()
            self.wfile.write(detail.encode())

        def do_POST(self):
            step = self.path.rsplit('/', 1)[-1]
            if self.path != f'/{run_id}/{step}' or len(completed) >= len(steps) or step != steps[len(completed)][0]:
                self.send_error(400)
                return
            _, expected, online = steps[len(completed)]
            try:
                if step in ('ios-replayed', 'replayed') and not replay_ready():
                    self.retry_later('Waiting for the app to replay the dropped acknowledgment.')
                    return
                # Poll the server when the flow does not wait for a Synced indicator.
                # Never repeat a UI action or a network change.
                try:
                    result = backend(expected, capture_output=True, text=True, timeout=10)
                except subprocess.CalledProcessError as error:
                    if step in ('delete-synced', 'ios-synced', 'conflict-flight-synced', 'kept-device') and 'AssertionError' in error.stderr:
                        self.retry_later(error.stderr)
                        return
                    raise
                print(result.stdout.strip(), flush=True)
                if scenario == 'android-keep-server-conflict':
                    if step == 'edited-offline':
                        assert_sync_dot('Pending sync', ('#b45309', '#ffad66'), step)
                    elif step == 'failed-dot':
                        assert_sync_dot('Sync failed', ('#ba1a2c', '#ffb1b8'), step)
                if online is not None:
                    set_online(online)
                completed.append(step)
                print(f'CHECKPOINT PASS: {step}', flush=True)
                self.send_response(200)
                self.end_headers()
                self.wfile.write(f'PASS: {step}'.encode())
            except Exception as error:
                detail = error.stderr if isinstance(error, subprocess.CalledProcessError) else str(error)
                print(f'CHECKPOINT FAILED: {step}\n{detail}', file=sys.stderr, flush=True)
                self.send_error(500, 'Server assertion failed; see runner output.')

    admin = psycopg2.connect(host='127.0.0.1', port=args.pg_port, user=args.pg_user, dbname='postgres')
    admin.autocommit = True
    try:
        for port in [args.api_port, args.metro_port]:
            with socket.socket() as sock:
                sock.setsockopt(socket.SOL_SOCKET, socket.SO_REUSEADDR, 1)
                sock.bind(('127.0.0.1', port))  # Fail instead of reusing somebody else's server.
        if ios:
            try:
                listing = command(['xcrun', 'simctl', 'list', 'devices', 'booted', '-j'],
                                  capture_output=True, text=True, timeout=20)
            except subprocess.CalledProcessError as error:
                raise RuntimeError('Cannot reach CoreSimulator. Check that Xcode Simulator is running '
                                   'and run the screen test from your Mac terminal.') from error
            simulators = json.loads(listing.stdout)['devices']
            if not any(item['udid'].upper() == device and item['name'] == IOS_SIMULATOR
                       and item['state'] == 'Booted' and item.get('isAvailable')
                       for runtime, items in simulators.items() if '.iOS-' in runtime for item in items):
                raise RuntimeError(f'Refusing to clear app data: boot the dedicated {IOS_SIMULATOR} simulator and pass its UDID.')
            claimed_device = True
            command(['xcrun', 'simctl', 'install', device, args.expo_app.resolve()], timeout=120)
        else:
            name = command(adb + ['emu', 'avd', 'name'], capture_output=True, text=True, timeout=10).stdout.splitlines()
            if not name or name[0].strip() != AVD:
                raise RuntimeError(f'Refusing to clear app data: device must be the dedicated {AVD} emulator.')
            claimed_device = True
            command(adb + ['wait-for-device'], timeout=60)
            wait_for('Android boot', lambda: command(adb + ['shell', 'getprop', 'sys.boot_completed'], capture_output=True, text=True).stdout.strip() == '1')
            command(adb + ['shell', 'cmd', 'connectivity', 'airplane-mode', 'disable'])
            command(adb + ['shell', 'svc', 'wifi', 'enable'])
            command(adb + ['install', '-r', args.expo_apk], timeout=120)
            command(adb + ['shell', 'pm', 'clear', 'host.exp.exponent'])
            command(adb + ['reverse', f'tcp:{args.metro_port}', f'tcp:{args.metro_port}'])
        with admin.cursor() as cursor:
            cursor.execute(sql.SQL('CREATE DATABASE {}').format(sql.Identifier(database)))
        created_db = True
        print(f'Created disposable PostgreSQL database: {database}', flush=True)
        with (output / 'migrations.log').open('w') as log:
            command([sys.executable, args.django / 'manage.py', 'migrate', '--noinput'], stdout=log, stderr=subprocess.STDOUT, timeout=180)
        backend('seed-validation' if scenario == 'flight-validation' else 'seed')
        api = start_api('django.log')
        metro = start([ROOT / 'node_modules/.bin/expo', 'start', '--go', '--localhost', '--port', args.metro_port], 'metro.log')
        wait_for('Metro', lambda: http_ready(args.metro_port, '/status'), process=metro)
        checkpoints = ThreadingHTTPServer(('127.0.0.1', 0), Checkpoint)
        threading.Thread(target=checkpoints.serve_forever, daemon=True).start()
        flow()
        assert completed == [step[0] for step in steps]
        print(f'\nPASS: {scenario}; {len(completed)} server checkpoints.', flush=True)
    finally:
        if checkpoints:
            checkpoints.shutdown()
            checkpoints.server_close()
        if claimed_device:
            cleanup = [['xcrun', 'simctl', 'terminate', device, IOS_EXPO_ID]] if ios else [
                adb + ['shell', 'cmd', 'connectivity', 'airplane-mode', 'disable'],
                adb + ['shell', 'svc', 'wifi', 'enable'],
                adb + ['shell', 'am', 'force-stop', 'host.exp.exponent'],
                adb + ['reverse', '--remove', f'tcp:{args.metro_port}'],
            ]
            for argv in cleanup:
                try:
                    subprocess.run(argv, env=env, capture_output=True, timeout=15, check=False)
                except (OSError, subprocess.TimeoutExpired) as error:
                    print(f'Emulator cleanup warning: {error}', file=sys.stderr)
        for child in reversed(children):
            stop(child)
        for log in logs:
            log.close()
        if created_db:
            with admin.cursor() as cursor:
                cursor.execute(sql.SQL('DROP DATABASE {} WITH (FORCE)').format(sql.Identifier(database)))
            print(f'Dropped disposable database: {database}', flush=True)
        admin.close()
        lock.close()


if __name__ == '__main__':
    def interrupted(_signal, _frame):
        raise KeyboardInterrupt
    signal.signal(signal.SIGTERM, interrupted)
    main()
