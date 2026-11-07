"""Run real Android screens against an isolated, disposable local Django API."""
import argparse
import fcntl
import getpass
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
import os
from pathlib import Path
import shutil
import signal
import socket
import subprocess
import sys
import time
import threading
from urllib.parse import quote
from urllib.request import urlopen
from urllib.error import HTTPError, URLError
import uuid

import psycopg2
from psycopg2 import sql
from scenarios import SCENARIOS

ROOT = Path(__file__).resolve().parent.parent
AVD = 'D2LB_Screen_Tests'


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--django', type=Path, default=Path.home() / 'django/direct2logbook')
    parser.add_argument('--maestro', default=shutil.which('maestro'))
    parser.add_argument('--expo-apk', type=Path, required=True, help='Expo Go APK matching this project SDK')
    parser.add_argument('--android-sdk', type=Path, default=Path(os.environ.get('ANDROID_HOME', Path.home() / 'Library/Android/sdk')))
    parser.add_argument('--pg-user', default=getpass.getuser())
    parser.add_argument('--pg-port', type=int, default=5432)
    parser.add_argument('--api-port', type=int, default=8010)
    parser.add_argument('--metro-port', type=int, default=8082)
    parser.add_argument('--emulator-port', type=int, default=5556)
    parser.add_argument('--scenario', choices=['all', *SCENARIOS], default='all',
                        help='all runs the CRUD and validation scenarios with separate databases')
    args = parser.parse_args()
    if not args.maestro or not Path(args.maestro).is_file():
        parser.error('Install Maestro and supply --maestro /path/to/maestro (or add it to PATH).')
    if not args.expo_apk.is_file() or not (args.django / 'logbook/settings_ci.py').is_file():
        parser.error('Supply an existing Expo Go APK and the Django checkout with settings_ci.py.')
    if not 5554 <= args.emulator_port <= 5682 or args.emulator_port % 2:
        parser.error('The emulator port must be an even number from 5554 to 5682.')

    scenarios = ['flight-crud', 'flight-validation'] if args.scenario == 'all' else [args.scenario]
    for scenario in scenarios:
        run_scenario(args, scenario)
    print(f'\nPASS: {len(scenarios)}/{len(scenarios)} screen scenarios.', flush=True)


def run_scenario(args, scenario):
    steps = SCENARIOS[scenario]

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
               EXPO_PUBLIC_API_URL=f'http://10.0.2.2:{args.api_port}',
               REACT_NATIVE_PACKAGER_HOSTNAME='127.0.0.1',
               MAESTRO_CLI_NO_ANALYTICS='1', MAESTRO_CLI_ANALYSIS_NOTIFICATION_DISABLED='true',
               JAVA_OPTS=f'-Duser.home={artifacts / "maestro-home"}',
               ANDROID_HOME=str(args.android_sdk))
    if not env.get('JAVA_HOME') and Path('/Applications/Android Studio.app/Contents/jbr/Contents/Home').exists():
        env['JAVA_HOME'] = '/Applications/Android Studio.app/Contents/jbr/Contents/Home'
    (artifacts / 'maestro-home').mkdir(exist_ok=True)
    env['PATH'] = f'{args.android_sdk / "platform-tools"}:{env["PATH"]}'
    database = 'd2lb_e2e_' + run_id
    env.update(DJANGO_SETTINGS_MODULE='backend_settings',
               DATABASE_URL=f'postgresql://{quote(args.pg_user, safe="")}@127.0.0.1:{args.pg_port}/{database}',
               PYTHONPATH=os.pathsep.join([str(ROOT / 'e2e'), str(args.django)]),
               PYTHONUNBUFFERED='1')
    adb = [str(args.android_sdk / 'platform-tools/adb'), '-s', f'emulator-{args.emulator_port}']
    children = []
    logs = []
    created_db = False
    claimed_device = False
    checkpoints = None

    def command(argv, **kwargs):
        return subprocess.run([str(x) for x in argv], env=env, cwd=ROOT, check=True, **kwargs)

    def start(argv, log_name, cwd=ROOT):
        log = (output / log_name).open('w')
        logs.append(log)
        process = subprocess.Popen([str(x) for x in argv], cwd=cwd, env=env,
                                   stdout=log, stderr=subprocess.STDOUT, start_new_session=True)
        children.append(process)
        return process

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

    def backend(action, **kwargs):
        return command([sys.executable, ROOT / 'e2e/backend.py', action], **kwargs)

    def flow():
        print(f'\nSCREEN TEST: {scenario}', flush=True)
        command([args.maestro, '--device', f'emulator-{args.emulator_port}', 'test',
                 '--test-output-dir', output, '--debug-output', output,
                 '--format', 'junit', '--output', output / 'screens.xml',
                 '-e', f'EXPO_URL=exp://127.0.0.1:{args.metro_port}',
                 '-e', f'CHECKPOINT_URL=http://127.0.0.1:{checkpoints.server_port}/{run_id}',
                 ROOT / f'e2e/{scenario}.yaml'], timeout=1200)

    completed = []

    class Checkpoint(BaseHTTPRequestHandler):
        def log_message(self, *_args):
            pass

        def do_POST(self):
            step = self.path.rsplit('/', 1)[-1]
            if self.path != f'/{run_id}/{step}' or len(completed) >= len(steps) or step != steps[len(completed)][0]:
                self.send_error(400)
                return
            _, expected, online = steps[len(completed)]
            try:
                # Deleted records have no per-row Synced indicator. Poll only the
                # server assertion; never repeat a UI action or a network change.
                try:
                    result = backend(expected, capture_output=True, text=True, timeout=10)
                except subprocess.CalledProcessError as error:
                    if step == 'delete-synced' and 'AssertionError' in error.stderr:
                        time.sleep(0.5)
                        self.send_response(202)
                        self.end_headers()
                        self.wfile.write(error.stderr.encode())
                        return
                    raise
                print(result.stdout.strip(), flush=True)
                if online is not None:
                    command(adb + ['shell', 'cmd', 'connectivity', 'airplane-mode', 'disable' if online else 'enable'])
                    command(adb + ['shell', 'svc', 'wifi', 'enable' if online else 'disable'])
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
        api = start([sys.executable, args.django / 'manage.py', 'runserver', f'127.0.0.1:{args.api_port}', '--noreload'], 'django.log', args.django)
        metro = start([ROOT / 'node_modules/.bin/expo', 'start', '--go', '--localhost', '--port', args.metro_port], 'metro.log')
        wait_for('Django', lambda: http_ready(args.api_port, '/api/mobile/session/'), process=api)
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
            for tail in [['shell', 'cmd', 'connectivity', 'airplane-mode', 'disable'], ['shell', 'svc', 'wifi', 'enable'],
                         ['shell', 'am', 'force-stop', 'host.exp.exponent'], ['reverse', '--remove', f'tcp:{args.metro_port}']]:
                try:
                    subprocess.run(adb + tail, env=env, capture_output=True, timeout=15, check=False)
                except (OSError, subprocess.TimeoutExpired) as error:
                    print(f'Emulator cleanup warning: {error}', file=sys.stderr)
        for child in reversed(children):
            if child.poll() is None:
                os.killpg(child.pid, signal.SIGTERM)
                try:
                    child.wait(timeout=10)
                except subprocess.TimeoutExpired:
                    os.killpg(child.pid, signal.SIGKILL)
                    child.wait()
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
