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

## Item 5: night mode

Branch: `mobile/05-night-mode`, based on merged item 4 (verified on Pixel 10).
Appearance in the drawer offers System, Light and Dark, with a saved device
preference. Shared colors cover navigation, forms, pickers, lists, details,
sync review, status bars and maps. No Django or database changes are needed.
The iOS simulator logbook, appearance screen and flight update form were visually
checked in dark mode. Native launch-screen appearance requires a new native build.

Validation: 35 tests pass, including preference persistence, write recovery and
text/button contrast. Lint, dependency checks, Expo Doctor and bundle exports
are checked before handoff. No commit or merge yet.

## Item 6: secure sessions and login/logout

Branch: `mobile/06-secure-sessions`, based on merged night mode (#27).
Tokens use Expo SecureStore (device-only, unlocked access); existing AsyncStorage
tokens migrate before plaintext is removed. Offline partitions retain the same
identity and queued changes remain on the device when signed out. Startup waits
for credential restoration and offers retry if storage cannot be accessed.

Login uses Formik validation/submission, prevents repeated requests and supports
password autofill. Authenticated requests centrally handle 401 responses; network
errors and 403 permission errors preserve offline access. A late response from
an earlier session cannot sign out a new login or populate its UI. Existing
unsaved-form and unsynced-change logout warnings remain. Logout removes the local
credential; it does not revoke Django's shared API token on other devices.

Validation: 46 mobile tests pass, including migration failures, logout failures,
request authentication and session races. Lint and Expo Doctor (20/20) pass.
iOS simulator restored the signed-in logbook after reload, then signed out to
the disabled-until-complete login form. User should verify signing in again on
both devices. Native development/release builds need rebuilding for SecureStore;
Expo Go already supplies the module. No Django changes or production deployment.

## Item 7: draft recovery

Branch: `mobile/07-draft-recovery`, based on merged secure sessions (#28).
Flight, aircraft and tailnumber create/update forms save unfinished values on
this device after a 400ms pause and flush when backgrounded or leaving. Drafts
are separated by account, resource and record; they are not uploaded or synced.
Reopening offers Resume draft / Discard above disabled form fields. Updates
whose baseline changed cannot restore a stale draft over the current record.
Corrupt/unreadable drafts require retry or explicit discard before editing.

The form shows Saving draft… / Draft saved on this device and reports storage
failures with a retry. Leaving a dirty form offers keep editing, save draft and
leave, or discard draft. Logout flushes drafts before removing the credential.
Successful record saves remove their draft; pending autosaves are cancelled so
they cannot recreate it. Drafts have no automatic expiration. A sudden process
kill before the debounce/background flush can lose the latest keystrokes.

Validation: 53 tests pass, including persistence across store recreation, account
isolation, ordered writes/removal, write failures and corrupt payloads. Lint
passes. iOS simulator verified autosave, Save draft and leave, the recovery
banner and restored aircraft values. A test draft named DRAFT remains in New
aircraft for review; no aircraft was submitted. iOS/Android bundle exports are
checked before handoff. No dependencies, native builds or Django changes.
Not committed or merged yet.

## Inline tailnumber picker

Branch: `mobile/08-inline-tailnumber-picker`, based on merged draft recovery (#29).
Flight create/update uses an inline filtered list instead of a modal. Suggestions
come from the offline tailnumber cache, are restricted to the selected aircraft,
ignore case/hyphens when searching and sort naturally. Up to six results float over the form without changing field positions. Typing is search only; selecting a result
sets the registration. Changing aircraft clears the previous selection.
The add-tailnumber action remains; tailnumber editing is available only from
Aircraft Detail. Results close on selection, loss of focus or tapping outside. The Close suggestions button and narrowing hint are removed.

Validation: 56 tests pass, lint passes. iOS simulator verified filtering 950 to
N950NK, selecting it and dismissing the list by moving to Route. iOS/Android
exports are checked before handoff. No record was submitted in this UI check.
Not committed or merged yet.

Aircraft Detail now places its actions above a responsive, independently
scrollable tailnumber grid. Registration links open Tailnumber Detail with an
Update action only. Tailnumber editing remains in the aircraft flow; there is
no tailnumber deletion action or related Django change.

## Mobile route airport checks

Branch: `mobile/09-route-airport-checks`, with companion Django branch
`mobile/route-airport-checks-api`. The route field colors unknown/ambiguous
airport codes red and explains each issue directly below. Checks debounce by
450ms, discard stale responses, and reuse Django's ICAO/IATA/FAA/US-resolution
rules. Ambiguous entries offer airport labels; choices persist on the flight
and clear when its route changes. Known errors block form submission.

A per-account, 24-hour code cache supports offline checks; uncached/expired codes
remain neutral and pending so flights can be saved on the device. New mobile
snapshots request server validation at upload. Django retains legacy API behavior
for older clients, validates all supplied choices, and advertises support. New
validated uploads wait until that API upgrade is deployed. No migration needed.
The sync worker's server-capability response no longer shadows its imported
secure-session object when obtaining an upload credential.

Logbook removes duplicate top safe-area padding and hides only the successful
100-flight notice after three seconds. Pending changes, failures and attention
messages remain visible. Empty status text no longer reserves space.

Validation: 61 mobile tests and 63 Django API tests pass; lint passes. iOS
simulator verified per-code red styling, the explanatory message, clearing the
error after restoring the original route, and compact list spacing. No flight
was submitted during that UI check. iOS/Android exports are checked before
handoff. Work is not committed, merged or deployed yet.

## Last-used aircraft default

Branch: `mobile/10-last-aircraft-default`. New flights prefill only the aircraft
type, using the last successfully saved flight on this device/account. Before
a preference exists, use the latest available flight type; absent/deleted types
fall back safely or leave the field blank. Tailnumber and route remain blank.
Remembered preferences are stored with account-scoped offline references and
move with the existing token-to-account cache transition. Preference-write
failure does not turn a successful flight save into a retry.

Draft recovery runs after defaults load and preserves the draft's values even
if defaults have changed; existing-record drafts still check their baseline.
Aircraft/registration text is centered across each logbook row using equal-width
side columns, with existing text fitting preserved. User declined recent routes,
last-tailnumber defaults and duplicate-flight shortcuts.

Validation: 64 mobile tests and lint pass; Android export passes. iOS simulator
visually checked centered metadata. No Django changes. Not committed or merged.

## Offline tailnumber creation

Branches: `mobile/11-offline-tailnumbers` and Django
`mobile/offline-tailnumbers-api`. New tailnumbers save into an account-scoped
SQLite queue and appear immediately in cached pickers and Aircraft Detail.
Sync uploads aircraft, then tailnumbers, then dependent flights; missing server
capabilities preserve the queue instead of posting dependent flights early.
Django creates tailnumbers and durable operation receipts atomically under the
account lock, so lost acknowledgements replay without duplicate creation.
No database migration or native dependency is introduced.

Existing synced tailnumber edits remain online. Pending creates may be corrected
until an upload becomes uncertain; they cannot be changed until that result is
confirmed. Registration/aircraft changes are blocked while unsynced flights use
the old values. Pending tailnumbers participate in retry timers, logout warnings
and sync review. Conflict resolution retains its saved-copy behavior, and cannot
remove a local tailnumber while flights still depend on it.

Validation: 71 mobile tests and 65 Django API tests pass; lint passes. Tests cover
queue persistence/cache refresh, account migration, immutable retries after lost
responses, rejected-create correction, duplicate checks and owned server writes.
The iOS form opened with cached aircraft and showed local-save messaging. No real
registration was submitted during UI checks. iOS/Android exports are checked
before handoff. Companion API must deploy before queued uploads can complete.
The prior uncommitted last-aircraft-default changes remain preserved in this
working tree. No changes committed, merged or deployed for this item yet.

## Shared scroll overflow indicators

Scrollable screens, record lists, picker lists and the drawer use a shared
wrapper with small leading/trailing chevrons only when content exists beyond
that edge. They hide during dragging/momentum and return after scrolling stops. Native scrollbars remain enabled. Indicators are non-interactive,
excluded from accessibility focus, and adapt to theme and measured content size.
Aircraft actions now appear above a separated Tailnumbers area with New
Tailnumber and the grid. The successful sync notice collapses over 250ms.

Validation: 64 mobile tests and lint pass; the lower tailnumber-grid indicator
was observed in the iOS simulator. iOS/Android exports checked before handoff.
Not committed or merged.

## Static logo loading screen

Branch: `mobile/static-logo-loader`. App session restoration and the shared busy
modal display the existing transparent logo centered with a short loading label.
The logo adapts to light/dark theme and screen width without animation.
The startup timing and native splash configuration are described below.
Validation: lint and Android export pass. Not committed or merged.

## Reference-pagination compatibility fix

The unpaginated Django aircraft/tailnumber endpoints previously returned all
records but inherited next/previous links based on PAGE_SIZE. This made the
mobile completeness check reject an otherwise complete 437-tailnumber response.
Django now returns null pagination links, and mobile verifies count/unique IDs
before accepting complete older responses that retain a spurious next link.
Genuinely incomplete or malformed responses still preserve the saved cache.
Validation: 77 mobile tests, 72 Django API tests and lint pass. The iOS simulator
was observed showing Synced last 100 entries after a fresh refresh. Not deployed.

Flight Detail and the logbook list now share FlightHeader: the date and duration
remain single-line with bounded text fitting, and aircraft/registration are
centered between equal-width side columns. This replaces Detail's older wrapping
header. Lint and Android export pass; physical-phone verification stays with
the user.

The theme-initialization screen now uses the same static logo, before the theme
context is ready. LogoArtwork is theme-independent to avoid circular imports;
LogoLoading supplies the current palette after initialization.

Startup branding also configures the static logo in the native splash plugin
at width 300 on a white background for both appearances.
The JavaScript logo is kept for at least 900ms after a full app load so it can
be seen even when cached session/theme initialization completes immediately.
Expo Go may still render its own app-name screen before JavaScript; native
splash changes require a rebuilt app.

## First native build: deferred logo check

- Verify the configured static Direct2Logbook logo on the native pre-load/splash
  screen on both iOS and Android, using a cold launch. Check scale, centering,
  background contrast, and transition to the in-app loading screen in light/dark
  mode. Expo Go does not verify this screen.
- Native build work is deferred at the user's request; continue in Expo Go.


## Map and detail-screen polish

Flight Detail fits the full geodesic route after the map has a measured layout,
with compact IATA/ICAO labels. Explicit absolute positioning avoids the removed
React Native absoluteFillObject shortcut that initially collapsed the map.
Sync loading and success share one notice; errors remain red until a successful
retry, with centered text and a separate retry line.
Aircraft detail places its tailnumber count beside the title and fills remaining
space with an aligned, scrollable registration grid. iOS retains native action
buttons; Android uses a filled New button and larger text Update/Delete actions.
Validation: 81 tests, lint, and iOS/Android exports checked before merge.


## Totals & Stats

Branch: `mobile/totals-stats`. The drawer opens a read-only API-sourced summary,
with expandable class/type details and recency. All flight numbers come from
Django's existing Total/Stat records; the device only formats and caches the
response per account for offline viewing. Download time and pending local
changes are shown. No on-device flight-total calculations; no hours suffix.
Django adds authenticated DRF GET /api/mobile/stats/ without schema migrations.
Validation: 83 mobile tests, 75 Django API tests, lint and Android export pass;
API summary data observed in the iOS simulator.


## Recency

Branch: `mobile/recency` in both repositories. A read-only DRF endpoint exposes
website VFR landing counts, instrument approach/holding counts, and landing
counts by type; device displays server flags without calculating currency.
Instrument queries are shared with the website to preserve its existing window
and date behavior. Snapshots are cached per account with calculation/download
dates, refresh and pending-change messaging. Matching Totals dropdown alignment
fixes are included. VFR, IFR and Type sections collapse independently and can
be reordered with drag handles; their order is saved per account on this device.
Totals previews show nonzero PIC/SIC/XC without repeating expanded rows. Totals
sync changed records through the existing queues before fetching the API snapshot;
success feedback expires and failures remain visible. The explanatory note lasts
five seconds and manual refresh explains automatic server calculation.
Validation: 93 mobile tests, lint and iOS/Android exports pass. Django API and home
regression tests cover ownership, date windows and shared instrument queries.


## Explicit default aircraft

Branch: `mobile/default-aircraft`. Each Aircraft list row has a native Default
switch, saved per account on the device and usable offline. Flight Create
uses only this explicit setting. With no valid default, the aircraft field
starts blank; last-used and recent-flight fallback logic has been removed. existing drafts retain their
saved values. The default does not prefill a registration or route. Removed an
invalid JSX return from the existing defaults-loading effect cleanup.
Validation: 96 tests and lint pass; Android export checked; initial detail switch observed in the
iOS simulator; final location is the aircraft list. No Django/API change is required for this device preference.


The shared green + button is draggable on Logbook and Aircraft. Taps still add
records; moves are clamped to each viewport with safe-area spacing and saved as
relative coordinates on the device, shared across both screens. Position storage
serializes rapid writes and ignores stale loads. Validation: 97 mobile tests and
lint pass; a moved button was observed without opening a form in iOS Simulator.


## Server-backed default aircraft (replaces device-only preference)

`mobile/default-aircraft` now has companion Django changes: Aircraft.is_default
and a conditional unique constraint allow at most one selected type per owner.
Authenticated DRF default preference sync uses the existing MobileSyncReceipt
protocol and an independent preference revision, preserving compatibility of
ordinary aircraft edit revisions. Migration 0066 is applied locally; production
requires deployment before preference uploads are enabled by the session capability.
Mobile stores a reserved preference record within the aircraft outbox. Normal
aircraft operations upload first, then the preference; pending selection survives
cache refresh and uses existing conflict comparison/archive/rebase. Default flags
are readable on the aircraft API but changes use the preference endpoint.
The old device-only default reference and last-used fallback are no longer read.
Validation: 641 Django tests, 101 mobile tests, lint and iOS/Android exports pass.
An A320 selection round trip was observed in iOS and confirmed in local Django;
the previous empty default was restored. Django PR #302 is merged and deployed,
including migration 0066. Mobile changes are included in this release branch.


## Logbook refresh policy and placeholders

Branch: `mobile/logbook-refresh-policy`. Normal focus/foreground/reconnect uses
saved flights without a server refresh after an initial successful download,
unless flights, aircraft/default preferences or tailnumbers remain pending.
Manual pull-to-refresh always checks the API. No-pending status is temporary and
does not claim that remote data was checked; sync failures stay red and visible.
Placeholders are left-aligned via shared AppTextInput and the route field.
The floating + buttons are replaced with fixed green New Flight/New Aircraft
buttons below each list and above the safe area; draggable-position code is removed.
Validation: mobile tests, lint and Android
export pass; return from Flight Detail showed the no-pending notice in iOS.


## Shared mobile cards

Branch: `mobile/card-layout` preserves the pending refresh-policy and fixed-bottom
button changes. Shared Card supplies theme-aware surface, corners and padding.
Compact cards now group Logbook/Aircraft list entries, flight/aircraft/tailnumber
details and forms, sign-in, recency and sync review; Appearance uses matching
spacing/corners. The map remains a separate rounded card with full-route fitting.
Recency drag handles are centered in the header, with title left and chevron right.
Validation: 100 tests and lint pass; iOS/Android exports pass. Logbook, Aircraft
list/detail and Flight Detail/map visually reviewed in iOS Simulator. Not committed.

### Mobile profile
- Profile drawer entry with Account, Subscription, Medical Certificate, and Signature cards.
- Account/name/company and medical edit screens use account-scoped draft protection; server saves require connectivity.
- Read-only subscription status from authenticated Django API; no in-app checkout.
- Signature preview and support email; signature management remains on the website.
- Matching Django branch: mobile/profile-api. No database migration required.
- Existing uncommitted card-layout changes preserved on mobile/profile.

### Touch signature capture
- Profile signature editor rotates to landscape; Save/Redo/Undo below the drawing, Back restores portrait.
- Reusable native SVG drawing pad; normalized strokes, protected account-scoped drafts, online saves.
- Django renders a PNG into the existing Signature model for website/PDF compatibility; stale replacements rejected.
- Portrait is restored on save, cancel/navigation away; Expo screen-orientation added with portrait startup configuration.
- Instructor endorsement signing remains a separate future workflow with its own document/signing records.

### Internet reconnect auto-sync
- App-level sync watches confirmed internet reachability, not just Wi-Fi/radio state.
- Pending flights, aircraft/default preferences, and tailnumbers upload when connectivity returns while active; rechecks on foreground.
- Existing queue deduplication, account boundaries, retries, conflict review, and confirmed-sync animations are retained.
- No operating-system background task is scheduled; a suspended app checks when reopened.

### Record-level issue resolution
- Removed general sync-manager navigation; only affected records show Update needed / Review.
- Temporary network failures retry quietly. Blocked validation and conflicts remain visible on flights, aircraft, default preferences, and tailnumbers.
- Device/online versions appear as selectable themed cards; Choose this flight stays disabled until a choice is made.
- Existing revision checks, account isolation, deletion protections, and recovery archives are preserved.
- Compact list cards and a 7px success indicator; confirmed uploads animate for 0.75 seconds, including offline/reconnect uploads.
