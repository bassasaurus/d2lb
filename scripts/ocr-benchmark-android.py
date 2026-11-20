#!/usr/bin/env python3
"""Run the bundled Android OCR engine in an isolated app, without account data."""
import argparse
import json
import os
from pathlib import Path
import shutil
import subprocess
import tempfile

ROOT = Path(__file__).resolve().parents[1]
PACKAGE = 'com.direct2logbook.ocrbenchmark'


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--cases', required=True, type=Path, help='JSON manifest; image paths relative to its directory.')
    parser.add_argument('--serial', required=True, help='Explicit ADB device serial.')
    parser.add_argument('--adb', default=str(Path.home() / 'Library/Android/sdk/platform-tools/adb'))
    parser.add_argument('--adb-port', default='5038')
    parser.add_argument('--gradle', default=shutil.which('gradle'), help='Gradle 9.4.1 executable.')
    parser.add_argument('--sdk', default=os.environ.get('ANDROID_HOME', str(Path.home() / 'Library/Android/sdk')))
    parser.add_argument('--output', required=True, type=Path, help='Raw native results; a .report.json is also written.')
    args = parser.parse_args()
    if not args.gradle:
        parser.error('Supply --gradle with a Gradle 9.4.1 executable.')
    manifest = args.cases.resolve()
    cases = json.loads(manifest.read_text())
    if not isinstance(cases, list) or not cases:
        parser.error('Manifest must contain a nonempty array of cases.')
    for row in cases:
        if not isinstance(row.get('expected'), str) or not (manifest.parent / row['file']).is_file():
            parser.error('Every case needs an expected registration and an existing image file.')
    args.output.parent.mkdir(parents=True, exist_ok=True)
    env = dict(os.environ)
    default_java = Path('/Applications/Android Studio.app/Contents/jbr/Contents/Home')
    if 'JAVA_HOME' not in env and default_java.exists():
        env['JAVA_HOME'] = str(default_java)
    adb = [args.adb, '-P', args.adb_port, '-s', args.serial]
    installed = []
    with tempfile.TemporaryDirectory(prefix='d2lb-ocr-benchmark-') as directory:
        project = Path(directory)
        shutil.copytree(ROOT / 'scripts/ocr/android-harness', project, dirs_exist_ok=True)
        source = ROOT / 'modules/tailnumber-ocr/android/src/main'
        native = project / 'app/src/main/java/expo/modules/tailnumberocr'
        native.mkdir(parents=True)
        for name in ('EnhancedOcr.kt', 'PaddleLineReader.kt', 'PaddleTextDetector.kt'):
            shutil.copy2(source / 'java/expo/modules/tailnumberocr' / name, native / name)
        shutil.copytree(source / 'assets', project / 'app/src/main/assets')
        fixtures = project / 'app/src/androidTest/assets'
        fixtures.mkdir(parents=True)
        normalized = []
        for index, row in enumerate(cases):
            image = manifest.parent / row['file']
            name = f'case-{index}{image.suffix}'
            shutil.copy2(image, fixtures / name)
            normalized.append({**row, 'file': name})
        (fixtures / 'cases.json').write_text(json.dumps(normalized))
        (project / 'local.properties').write_text(f'sdk.dir={args.sdk}\n')
        log = args.output.with_suffix('.build.log')
        with log.open('w') as output:
            subprocess.run([args.gradle, '-p', str(project), ':app:assembleDebug', ':app:assembleDebugAndroidTest', '--console=plain'],
                           env=env, stdout=output, stderr=subprocess.STDOUT, check=True)
        try:
            for package, apk in ((PACKAGE, 'debug/app-debug.apk'), (PACKAGE + '.test', 'androidTest/debug/app-debug-androidTest.apk')):
                subprocess.run(adb + ['install', '-r', str(project / 'app/build/outputs/apk' / apk)], check=True)
                installed.append(package)
            result = subprocess.run(adb + ['shell', 'am', 'instrument', '-w', '-r', '-e', 'class',
                                          'expo.modules.tailnumberocr.PhotoBenchmarkTest',
                                          PACKAGE + '.test/androidx.test.runner.AndroidJUnitRunner'],
                                    text=True, capture_output=True, check=True)
            args.output.with_suffix('.instrument.log').write_text(result.stdout + result.stderr)
            if 'OK (1 test)' not in result.stdout:
                raise RuntimeError('Native benchmark failed; inspect the instrumentation log.')
            raw = subprocess.check_output(adb + ['exec-out', 'run-as', PACKAGE, 'cat', 'files/benchmark.json'])
            if len(json.loads(raw)) != len(cases):
                raise RuntimeError('Native benchmark did not finish every case.')
            args.output.write_bytes(raw)
            report = args.output.with_suffix('.report.json')
            with report.open('w') as output:
                subprocess.run(['node', str(ROOT / 'scripts/ocr-benchmark.mjs'), str(args.output)], stdout=output, check=True)
            print(f'Native cases completed: {len(cases)}. Report: {report}')
        finally:
            # These are dedicated benchmark packages, never the user's app.
            for package in reversed(installed):
                subprocess.run(adb + ['uninstall', package], check=False)


if __name__ == '__main__':
    main()
