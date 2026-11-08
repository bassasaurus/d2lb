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

stage_conflict = sys.argv[1] == 'stage-server-conflict'
state = 'original' if stage_conflict else sys.argv[1]
if state in ['seed', 'seed-validation']:
    if get_user_model().objects.exists() or Flight.objects.exists():
        raise RuntimeError('Refusing to seed an occupied database.')
    user = get_user_model().objects.create_user(username=EMAIL, email=EMAIL, password=PASSWORD)
    user.profile.free_access = True
    user.profile.save()
    aircraft = Aircraft.objects.create(user=user, aircraft_type='C172', is_default=state == 'seed',
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
    expected, expected_receipts = {
        'empty': (0, 0), 'original': (1, 1), 'updated': (1, 2),
        'deleted': (0, 3), 'night-warning': (1, 1), 'night-only': (1, 2),
        'server-conflict': (1, 1),
    }[state]
    flights = Flight.objects.count()
    acknowledgements = list(MobileSyncReceipt.objects.order_by('created_at', 'pk'))
    receipts = len(acknowledgements)
    assert flights == expected, f'Expected {expected} flights, found {flights}'
    assert receipts == expected_receipts, f'Expected {expected_receipts} sync receipts, found {receipts}'
    if receipts:
        original_id = acknowledgements[0].response['flight']['id']
        for receipt in acknowledgements:
            assert receipt.user.username == EMAIL
            response = receipt.response
            assert (response['flight']['id'] if 'flight' in response else response['deleted_id']) == original_id
        if state == 'deleted':
            assert acknowledgements[-1].response['deleted_id'] == original_id
    if expected:
        flight = Flight.objects.get()
        assert flight.pk == original_id, 'An update must keep the original flight ID'
        assert flight.user.username == EMAIL
        assert flight.route == 'KAUS-KDFW'
        expected_duration = {'updated': '2.3', 'server-conflict': '3.4'}.get(state, '1.2')
        assert flight.duration == Decimal(expected_duration)
        assert (flight.remarks or '') == ('Edited while offline' if state == 'updated' else '')
        assert flight.aircraft_type.aircraft_type == 'C172'
        assert flight.registration.registration == 'N1234'
        assert flight.pilot_in_command is True
        assert flight.solo is False
        assert flight.date == date.today()
        assert (flight.landings_day or 0) == 0
        assert (flight.landings_night or 0) == (1 if state == 'night-warning' else 0)
        assert (flight.night or 0) == (0.4 if state == 'night-only' else 0)
    print(f'PASS: {state}: {flights} flight(s), {receipts} sync receipt(s); record values and IDs verified.')
    if stage_conflict:
        Flight.objects.filter(pk=flight.pk).update(duration=Decimal('3.4'))
        print('Staged a server edit to 3.4 hours on the original flight.')
