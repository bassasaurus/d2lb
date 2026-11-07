"""Install the pinned screen-test tools without executing remote install scripts."""
import argparse
import hashlib
import json
from pathlib import Path
import tempfile
from urllib.request import urlopen
from zipfile import ZipFile

ROOT = Path(__file__).resolve().parent.parent


def check_sdk(expo_version, expected_sdk):
    if int(expo_version.split('.')[0]) != expected_sdk:
        raise ValueError('Expo SDK changed. Update e2e/ci-tools.json and verify the new Expo Go APK before running screen tests.')


def file_digest(path):
    with path.open('rb') as source:
        return hashlib.file_digest(source, 'sha256').hexdigest()


def download_verified(asset, destination):
    if destination.is_file() and file_digest(destination) == asset['sha256']:
        return
    if not asset['url'].startswith('https://'):
        raise ValueError('Screen-test tools must be downloaded over HTTPS.')
    destination.parent.mkdir(parents=True, exist_ok=True)
    temporary = None
    try:
        with tempfile.NamedTemporaryFile(dir=destination.parent, delete=False) as target:
            temporary = Path(target.name)
            with urlopen(asset['url'], timeout=60) as response:
                while chunk := response.read(1024 * 1024):
                    target.write(chunk)
        if file_digest(temporary) != asset['sha256']:
            raise ValueError(f'Checksum mismatch for {destination.name}; refusing to install.')
        temporary.replace(destination)
    finally:
        if temporary is not None:
            temporary.unlink(missing_ok=True)


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('destination', type=Path)
    args = parser.parse_args()
    manifest = json.loads((ROOT / 'e2e/ci-tools.json').read_text())
    expo = json.loads((ROOT / 'node_modules/expo/package.json').read_text())
    check_sdk(expo['version'], manifest['expo_sdk'])
    download_verified(manifest['expo_go'], args.destination / 'expo-go.apk')
    download_verified(manifest['maestro'], args.destination / 'maestro.zip')
    with ZipFile(args.destination / 'maestro.zip') as archive:
        archive.extractall(args.destination)
    (args.destination / 'maestro/bin/maestro').chmod(0o755)
    print(f"Verified Expo Go {manifest['expo_go']['version']} and Maestro {manifest['maestro']['version']}.")


if __name__ == '__main__':
    main()
