"""Fixtures and independent server checks for the categories screen workflow."""
from datetime import date
from decimal import Decimal
from django.contrib.auth import get_user_model
from django.test import Client
from flights.aircraft_classification import SUMMARY_CLASSIFICATIONS
from flights.models import Aircraft, Flight, MapData, TailNumber, Total
from api.models import MobileSyncReceipt
from home.pilot_time import pilot_time_report
EMAIL = 'screen-test@example.invalid'
PASSWORD = 'Disposable-screen-test-42'


def run(state):
    if state == 'categories-seed':
        if get_user_model().objects.exists() or Flight.objects.exists():
            raise RuntimeError('Refusing to seed an occupied database.')
        user = get_user_model().objects.create_user(username=EMAIL, email=EMAIL, password=PASSWORD)
        user.profile.free_access = True
        user.profile.active = True
        user.profile.save()
        for icao, iata, name, lat, lon in [('KAUS', 'AUS', 'Austin', 30.1975, -97.6664), ('KDFW', 'DFW', 'Dallas', 32.8968, -97.038)]:
            MapData.objects.create(icao=icao, iata=iata, name=name, city=name, country='United States', latitude=lat, longitude=lon)
        for code, (category, klass) in SUMMARY_CLASSIFICATIONS.items():
            aircraft = Aircraft.objects.create(user=user, aircraft_type=code, aircraft_category=category,
                aircraft_class=klass, small=True, piston=category not in ('GL',) and klass != 'BALLOON',
                self_launch_capable=category == 'GL', is_default=code == 'ASEL')
            tail = TailNumber.objects.create(user=user, aircraft=aircraft, registration='N' + code, is_91=True)
            for method in (('AEROTOW', 'GROUND', 'SELF') if category == 'GL' else ('',)):
                Flight.objects.create(user=user, aircraft_type=aircraft, registration=tail,
                    date=date.today(), duration='1.2', route='KAUS-KDFW', pilot_in_command=True, launch_method=method)
            if code == 'ASEL':
                Flight.objects.create(user=user, aircraft_type=aircraft, date=date.today(), duration='2.4',
                    simulator=True, device_type='FFS', device_id='CATEGORY-SIM', dual=True)
        print('Seeded every category/class, three glider launch methods and a separate 2.4-hour simulator session.')
        return
    user = get_user_model().objects.get(username=EMAIL)
    synced = state == 'categories-synced'
    assert Flight.objects.count() == (14 if synced else 13)
    assert MobileSyncReceipt.objects.count() == (3 if synced else 0)
    assert Aircraft.objects.filter(aircraft_type='GLT1').exists() == synced
    if synced:
        aircraft = Aircraft.objects.get(user=user, aircraft_type='GLT1')
        assert aircraft.aircraft_category == 'GL' and aircraft.aircraft_class == ''
        assert aircraft.self_launch_capable and not any((aircraft.piston, aircraft.turbine, aircraft.electric,
            aircraft.requires_type, aircraft.compleks, aircraft.high_performance))
        tail = TailNumber.objects.get(user=user, registration='NGT1')
        flight = Flight.objects.get(user=user, aircraft_type=aircraft)
        assert tail.aircraft_id == aircraft.pk and flight.registration_id == tail.pk
        assert tail.is_91 and not tail.is_135 and not tail.is_121
        assert flight.launch_method == 'SELF' and flight.duration == Decimal('1.2') and not flight.simulator
        receipts = list(MobileSyncReceipt.objects.order_by('created_at', 'pk'))
        assert receipts[0].response['record']['aircraft_type'] == 'GLT1'
        assert receipts[1].response['record']['registration'] == 'NGT1'
        assert receipts[-1].response['flight']['id'] == flight.pk
    overall = Total.objects.get(user=user, total='All')
    assert overall.total_time == Decimal('15.6' if synced else '14.4')
    assert overall.simulator == Decimal('2.4')
    report = pilot_time_report(user)
    row = next(row for row in report['launches'] if row['code'] == 'GL')
    assert [row[k] for k in ('flights', 'aerotow', 'ground', 'self_launch')] == ([4, 1, 1, 2] if synced else [3, 1, 1, 1])
    glider = next(row for row in report['rows'] if row['code'] == 'GL')
    assert glider['cells'][0]['value'] == Decimal('4.8' if synced else '3.6')
    assert next(row for row in report['rows'] if row['code'] == 'FFS')['cells'][0]['value'] == Decimal('2.4')
    assert len(report['classes']) == 10
    client = Client()
    client.force_login(user)
    home = client.get('/home/')
    assert home.status_code == 200, (home.status_code, home.get("Location"))
    for expected in ('Powered Lift', 'Gliders', 'Lighter-Than-Air', 'Balloon', 'Airship', 'Ground Launches'):
        assert expected.encode() in home.content
    print(f'PASS: {state}; web, hours, all classes, launch counts and simulator separation verified; no duplicates.')
