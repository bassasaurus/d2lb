"""Seed/assert via the ORM, without adding test endpoints to the application."""
import sys
import os
from datetime import date
from decimal import Decimal

import django
if os.environ.get('DJANGO_SETTINGS_MODULE') != 'backend_settings':
    raise RuntimeError('Use the screen-test runner with its isolated backend_settings.')
django.setup()

from django.contrib.auth import get_user_model  # noqa: E402
from api.models import MobileSyncReceipt  # noqa: E402
from flights.models import Aircraft, Flight, MapData, TailNumber  # noqa: E402

EMAIL = 'screen-test@example.invalid'
PASSWORD = 'Disposable-screen-test-42'

if sys.argv[1] == 'seed':
    if get_user_model().objects.exists() or Flight.objects.exists():
        raise RuntimeError('Refusing to seed an occupied database.')
    user = get_user_model().objects.create_user(username=EMAIL, email=EMAIL, password=PASSWORD)
    user.profile.free_access = True
    user.profile.save()
    aircraft = Aircraft.objects.create(user=user, aircraft_type='C172', is_default=True,
                                       aircraft_category='A', aircraft_class='SEL', piston=True, small=True)
    TailNumber.objects.create(user=user, aircraft=aircraft, registration='N1234', is_91=True)
    for icao, iata, name, latitude, longitude in [
        ('KAUS', 'AUS', 'Austin Bergstrom', 30.1975, -97.6664),
        ('KDFW', 'DFW', 'Dallas Fort Worth', 32.8968, -97.038),
    ]:
        MapData.objects.create(icao=icao, iata=iata, name=name, city=name,
                               country='United States', latitude=latitude, longitude=longitude)
    print('Seeded disposable account, C172, N1234 and two airports.')
else:
    expected = int(sys.argv[1])
    flights = Flight.objects.count()
    receipts = MobileSyncReceipt.objects.count()
    assert flights == expected, f'Expected {expected} flights, found {flights}'
    assert receipts == expected, f'Expected {expected} sync receipts, found {receipts}'
    if expected:
        flight = Flight.objects.get()
        assert flight.user.username == EMAIL
        assert flight.route == 'KAUS-KDFW'
        assert flight.duration == Decimal('1.2')
        assert flight.aircraft_type.aircraft_type == 'C172'
        assert flight.registration.registration == 'N1234'
        assert flight.pilot_in_command is True
        assert flight.date == date.today()
    print(f'PASS: server has {flights} flight(s), {receipts} sync receipt(s).')
