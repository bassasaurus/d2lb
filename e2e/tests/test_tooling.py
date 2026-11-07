import hashlib
import io
from pathlib import Path
import os
import shutil
import subprocess
import tempfile
import unittest
from unittest.mock import patch
from urllib.parse import unquote, urlparse

from e2e.config import database_url
from e2e.install_tools import check_sdk, download_verified


class DatabaseConfigurationTests(unittest.TestCase):
    def test_password_with_url_characters_survives_round_trip(self):
        password = 'a:@/#?% b'
        url = urlparse(database_url('test user', 55432, 'd2lb_e2e_123456abcdef', password))
        self.assertEqual(unquote(url.username), 'test user')
        self.assertEqual(unquote(url.password), password)
        self.assertEqual(url.hostname, '127.0.0.1')
        self.assertEqual(url.port, 55432)
        self.assertEqual(url.path, '/d2lb_e2e_123456abcdef')

    def test_local_passwordless_connection_still_works(self):
        url = urlparse(database_url('local-user', 5432, 'd2lb_e2e_123456abcdef'))
        self.assertEqual(url.username, 'local-user')
        self.assertIsNone(url.password)


class ToolInstallationTests(unittest.TestCase):
    def setUp(self):
        self.directory = tempfile.TemporaryDirectory()
        self.addCleanup(self.directory.cleanup)
        self.destination = Path(self.directory.name) / 'expo-go.apk'
        self.payload = b'verified test asset'
        self.asset = {'url': 'https://example.invalid/tool',
                      'sha256': hashlib.sha256(self.payload).hexdigest()}

    def test_download_is_installed_only_when_checksum_matches(self):
        with patch('e2e.install_tools.urlopen', return_value=io.BytesIO(self.payload)):
            download_verified(self.asset, self.destination)
        self.assertEqual(self.destination.read_bytes(), self.payload)

    def test_corrupt_download_keeps_existing_file_and_removes_temporary_file(self):
        self.destination.write_bytes(b'old copy')
        with patch('e2e.install_tools.urlopen', return_value=io.BytesIO(b'corrupted')):
            with self.assertRaisesRegex(ValueError, 'Checksum mismatch'):
                download_verified(self.asset, self.destination)
        self.assertEqual(self.destination.read_bytes(), b'old copy')
        self.assertEqual(list(self.destination.parent.iterdir()), [self.destination])

    def test_verified_cached_file_does_not_need_a_download(self):
        self.destination.write_bytes(self.payload)
        with patch('e2e.install_tools.urlopen') as request:
            download_verified(self.asset, self.destination)
            request.assert_not_called()

    def test_network_failure_cleans_up_partial_download(self):
        with patch('e2e.install_tools.urlopen', side_effect=TimeoutError('download timed out')):
            with self.assertRaises(TimeoutError):
                download_verified(self.asset, self.destination)
        self.assertEqual(list(self.destination.parent.iterdir()), [])

    def test_plain_http_download_is_rejected(self):
        with self.assertRaisesRegex(ValueError, 'HTTPS'):
            download_verified({**self.asset, 'url': 'http://example.invalid/tool'}, self.destination)

    def test_sdk_upgrade_requires_updating_pinned_expo_go(self):
        check_sdk('58.0.23', 58)
        with self.assertRaisesRegex(ValueError, 'Expo SDK changed'):
            check_sdk('59.0.0', 58)


class WorkflowWrapperTests(unittest.TestCase):
    def test_failure_is_preserved_and_android_logs_are_still_captured(self):
        with tempfile.TemporaryDirectory(prefix='screen tests ') as directory:
            root = Path(directory)
            (root / 'e2e').mkdir()
            shutil.copyfile(Path(__file__).resolve().parents[1] / 'ci-run.sh', root / 'e2e/ci-run.sh')
            interpreter = root / 'tools/screen-test-backend/bin/python'
            adb = root / 'android/platform-tools/adb'
            for path, script in [
                (interpreter, '#!/bin/sh\necho "simulated screen failure"\nexit 17\n'),
                (adb, '#!/bin/sh\necho "captured android logs"\n'),
            ]:
                path.parent.mkdir(parents=True, exist_ok=True)
                path.write_text(script)
                path.chmod(0o755)
            result = subprocess.run(['bash', 'e2e/ci-run.sh'], cwd=root, capture_output=True, text=True,
                                    env={**os.environ, 'RUNNER_TEMP': str(root / 'tools'),
                                         'ANDROID_HOME': str(root / 'android'), 'SCREEN_TEST_SCENARIO': 'all'})
            self.assertEqual(result.returncode, 17, result.stderr)
            self.assertIn('simulated screen failure', (root / '.screen-tests/terminal.log').read_text())
            self.assertIn('captured android logs', (root / '.screen-tests/android-logcat.txt').read_text())


if __name__ == '__main__':
    unittest.main()
