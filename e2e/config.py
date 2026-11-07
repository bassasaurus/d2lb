"""Configuration shared by local and CI screen-test runners."""
from urllib.parse import quote


def database_url(user, port, database, password=None):
    credentials = quote(user, safe='')
    if password:
        credentials += ':' + quote(password, safe='')
    return f'postgresql://{credentials}@127.0.0.1:{port}/{database}'
