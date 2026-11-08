"""Ordered server assertions and network transitions for each screen scenario.

Each tuple is (checkpoint name, expected database state, online or unchanged).
"""
CREATE_STEPS = [
    ('offline', 'empty', False),
    ('saved-offline', 'empty', None),
    ('reconnect', 'empty', True),
    ('synced', 'original', None),
    ('refreshed', 'original', None),
]

CONFLICT_STEPS = [
    ('signed-in', 'empty', None),
    ('conflict-flight-synced', 'original', False),
    ('edited-offline', 'stage-server-conflict', True),
    ('conflict-detected', 'server-conflict', None),
]

ANDROID_SYNC_RECOVERY = (
    'android-sync-lost-response', 'android-keep-server-conflict', 'android-keep-device-conflict',
)

SCENARIOS = {
    'ios-flight-smoke': [
        ('signed-in', 'empty', None),
        ('ios-synced', 'original', None),
    ],
    'ios-offline-flight': [
        ('ios-synced', expected, online) if step == 'synced' else (step, expected, online)
        for step, expected, online in CREATE_STEPS
    ],
    'ios-sync-lost-response': [
        ('signed-in', 'empty', None),
        ('ios-replayed', 'original', None),
    ],
    'ios-keep-server-conflict': CONFLICT_STEPS + [('kept-server', 'server-conflict', None)],
    'ios-keep-device-conflict': CONFLICT_STEPS + [('kept-device', 'device-conflict-resolved', None)],
    'android-sync-lost-response': [
        ('signed-in', 'empty', None),
        ('replayed', 'original', None),
    ],
    'android-keep-server-conflict': CONFLICT_STEPS + [('kept-server', 'server-conflict', None)],
    'android-keep-device-conflict': CONFLICT_STEPS + [('kept-device', 'device-conflict-resolved', None)],
    'offline-flight': CREATE_STEPS,
    'flight-crud': CREATE_STEPS + [
        ('cancel-offline', 'original', False),
        ('cancelled', 'original', None),
        ('edited-offline', 'original', None),
        ('edit-reconnect', 'original', True),
        ('edit-synced', 'updated', None),
        ('delete-offline', 'updated', False),
        ('delete-cancelled', 'updated', None),
        ('deleted-offline', 'updated', None),
        ('delete-reconnect', 'updated', True),
        ('delete-synced', 'deleted', None),
        ('delete-refreshed', 'deleted', None),
    ],
    'flight-validation': [
        ('required-fields', 'empty', None),
        ('invalid-duration', 'empty', None),
        ('required-role', 'empty', None),
        ('solo-landings', 'empty', None),
        ('warning-saved', 'night-warning', None),
        ('night-only-saved', 'night-only', None),
    ],
}
