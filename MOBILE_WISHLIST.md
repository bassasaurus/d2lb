# Mobile Wishlist

This list belongs to the React Native / Expo app. Django changes belong here only
when required for API compatibility or shared data correctness. Start a separate
branch for each numbered item.

1. Offline-first storage and reliable synchronization — `mobile/01-offline-first`
2. Complete flight, aircraft, and tailnumber workflows
3. Conflict resolution and duplicate prevention
4. Adaptive phone and tablet layouts
5. System, light, and dark modes
6. Secure sessions and account isolation
7. Draft recovery
8. Faster flight-entry shortcuts
9. Connection and sync status
10. Mobile testing and release checks

## Item 1: current implementation

Mobile branch: `mobile/01-offline-first`.
Required API compatibility branch: Django `mobile/offline-sync-api`.

Implemented:
- Versioned Expo SQLite database; records and pending changes are saved locally
  before navigating away. New flights receive stable local UUIDs.
- The device caches the 100 most recent server flights, plus all pending local
  changes. Upload passes handle at most 100 operations; excess changes stay queued.
- Server data is downloaded before replacing the cached snapshot; pending edits
  and deletion tombstones are protected from refreshes.
- Cached tailnumbers support aircraft/tailnumber selection without a connection.
- Queue operations are immutable once attempted. Timeouts retain the operation ID
  and payload, including across an app restart. Acknowledgements clear a queue
  entry only after local SQLite commits the result.
- Edits/deletes made during an upload remain pending after its acknowledgement.
- Foreground, reconnect, pull-to-refresh and a foreground retry timer process the
  queue. Retry delays persist and back off to five minutes. Idle logbooks are not
  downloaded every thirty seconds.
- Stable server account IDs isolate local data by API origin/account. Existing
  token-partitioned data is moved safely; incompatible caches require review.
- Pending count, upload/validation/conflict messages, offline status and a warning
  before signing out with pending changes.
- Older servers can still supply cached flights; uploads wait for the sync API.
- Existing unscoped AsyncStorage offline flights remain untouched for review.

API behavior:
- Authenticated `GET /api/mobile/session/` supplies account ID and protocol 1.
- `POST /api/mobile/flight-sync/` accepts a UUID, create/update/delete action,
  optional flight ID/base revision, and flight data.
- A flight write and its durable receipt commit in the same transaction.
  Retrying the same operation returns its saved receipt without another write.
  Reusing an ID for different data is rejected.
- Per-owner PostgreSQL row locks serialize concurrent requests. A content revision
  detects changes since a mobile record was downloaded; conflicting updates and
  deletes return 409 instead of overwriting newer server data.
- The existing API remains available. Flight representations add a read-only
  revision. Sync updates replace the approach set; legacy PATCH behavior remains.

Deployment/testing status:
- API migration `api.0001_initial` has been applied to the local database only.
- Mobile implementation: PR #23 in bassasaurus/d2lb. Companion API: PR #293
  in bassasaurus/direct2logbook. Production deployment remains separate.
- 597 Django tests pass, including concurrent duplicate uploads, acknowledgement
  replay, conflict prevention, ownership and transaction rollback.
- 20 mobile tests pass, including real SQLite close/reopen, rollback, persistent
  operation IDs, lost responses and edits/deletes during an upload.
- Platform Hermes exports, lint and Expo compatibility checks pass. A running
  iOS logbook was observed without a startup error.
- User confirmed the local emulator acceptance test: offline creation, app
  restart, synchronization without duplicates, offline edits and deletion.
- Create/update and tailnumber forms warn before discarding unfinished changes;
  logout also checks open forms. The iOS date picker has Done/Cancel controls.

Remaining follow-ups:
- Explicit review/account assignment of the old AsyncStorage queue, if present.
- User-facing conflict resolution belongs to item 3; conflicts currently remain
  stored and blocked with an error rather than silently selecting a winner.
- Native background execution, offline map tiles, and offline creation of new
  aircraft/tailnumbers are separate follow-ups. Sync runs while the app is active
  and when it returns to the foreground.

## Item 2: aircraft management and tailnumber editing

Mobile branch: `mobile/02-aircraft-tailnumbers`.
Companion Django branch: `mobile/02-aircraft-api`.

- Aircraft list, detail, create, update and delete screens are available from the
  drawer. The logbook's floating green add button and shared pencil/delete action
  row are reused for continuity.
- Aircraft records use an isolated namespace in the existing SQLite/outbox
  repository. Saves persist locally and sync through acknowledged operations;
  pending aircraft changes synchronize before dependent flight uploads.
- The aircraft picker uses the aircraft cache, so a type no longer needs an
  existing tailnumber to appear. New Aircraft remains accessible from the picker.
- The API advertises aircraft sync support and adds aircraft revisions plus an
  acknowledged aircraft-sync endpoint. It reuses the receipt table from item 1;
  there is no additional database migration.
- Deletion is blocked when tailnumbers, flights or imported totals reference the
  aircraft. Rejected deletions can be cancelled locally; uncertain attempted
  deletions must first be reconciled. Existing type designators are read-only in
  mobile updates; rename them through the website.
- A full-width green New Tailnumber button on aircraft details opens the existing
  creation form with the aircraft preselected and returns after saving.
- Aircraft details list their tailnumbers with pencil edit controls. The flight
  form's registration picker also has a pencil beside each tailnumber.
- Tailnumber editing supports registration, aircraft and operating rules, with
  preselected existing values, validation and unfinished-form protection. It uses
  the existing owned API and requires a connection; it is not an offline queue.
  Renaming/reassigning is blocked while local pending flights use the old value.
- User confirmed Aircraft CRUD, deletion safeguards and tailnumber editing locally.
- Mobile checks: 22 tests, lint, Expo Doctor and both platform exports pass.

Deploy the companion Django API before relying on production aircraft uploads.
Neither PR creation nor a Git merge distributes a mobile app or deploys Django.

## Item 3: sync conflict review

Branch: `mobile/03-sync-conflicts`, based on merged item 2.
No Django API change is needed; existing owned detail endpoints and content
revisions support the review flow.

- Sync review is an on-demand modal, not a drawer destination. Logbook and
  aircraft lists show Resolve sync problems only when errors exist, including
  pending deletions. The modal closes when no issues remain.
- A comparison displays local and server values, with differences first and an
  option to show all editable fields. The current server copy is fetched before
  resolution; unavailable/uncertain uploads cannot be resolved by guessing.
- Use server version replaces the local copy. Use local changes queues a new
  operation against the displayed server revision; a later server edit still
  produces another conflict. Deletion conflicts require an explicit deletion
  choice rather than converting an update automatically.
- If the server record was deleted, the user may accept that deletion or
  explicitly save the local version as a new record. Re-creation removes old IDs
  and revisions. Rejected new drafts may be edited or archived and removed.
- Both displayed versions are archived in SQLite in the same transaction as the
  resolution, and can be read under Saved copies. They are isolated by account
  and resource namespace. This history is local, not a server backup or an
  automatic undo/sync operation.
- Resolution checks the local generation and displayed server revision. Open
  create/update forms must be closed before resolving, preventing stale forms
  from later submitting an older view of the chosen record.
- SQLite upgrades from schema 2 to 3 add review/history tables while preserving
  cached records and pending operations. No server migration is introduced.
- Existing operation IDs and immutable retry payloads continue to prevent
  duplicate writes after lost responses.

Validation: 30 mobile tests, lint, Expo Doctor 20/20 and iOS/Android exports pass.
The review screen was observed opening in iOS. Manual end-to-end conflict-choice
verification with disposable local records remains before merge. No commit,
production deployment or app distribution performed for this item yet.

## Item 4: portrait phone layouts

Branch: `mobile/04-portrait-layouts`. Landscape and tablets are deferred at the
user's request. Initial focus is logbook rows on the user's Pixel 10.

The date/duration and crew use content-sized columns instead of fixed flex
proportions. Aircraft/registration share a single flexible text line, and route
text receives the remaining row width. Bounded text fitting prevents accidental
wrapping; very long routes may abbreviate in the list and remain available in
details. AppText now forwards native Text props and styles, so fitting controls
actually reach the native text component. System font scaling remains enabled.

Validation: lint and Android bundle export pass. Personal-device confirmation
remains with the user; no claim is made that an emulator exactly matches their
Pixel's font/display settings. No commit or merge yet for this item.
