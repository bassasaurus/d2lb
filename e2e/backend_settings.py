"""Local-only settings for the disposable mobile screen-test database."""
import os
import re
from urllib.parse import urlparse

database = urlparse(os.environ.get('DATABASE_URL', ''))
if (database.scheme != 'postgresql' or database.hostname != '127.0.0.1'
        or not re.fullmatch(r'/d2lb_e2e_[a-f0-9]{12}', database.path)):
    raise RuntimeError('Screen tests require a disposable local d2lb_e2e database.')

from logbook.settings_ci import *  # noqa: E402,F403

ALLOWED_HOSTS = ['127.0.0.1', 'localhost', '10.0.2.2', 'testserver']
SECURE_SSL_REDIRECT = False
SESSION_COOKIE_SECURE = False
CSRF_COOKIE_SECURE = False
ALLAUTH_TRUSTED_PROXY_COUNT = 0
PASSWORD_HASHERS = ['django.contrib.auth.hashers.MD5PasswordHasher']
SENTRY_DSN = ''
