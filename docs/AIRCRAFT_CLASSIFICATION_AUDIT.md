# Aircraft category/class expansion: Step 1 mobile review

No production screens, storage schemas, queued operations or API requests were
changed in Step 1. `tests/classificationCompatibility.test.mjs` exercises the
existing compatibility boundaries with disposable SQLite databases. The table
below records the original baseline; see `AIRCRAFT_CATEGORIES_8710.md` for Step 2.

| Area | Existing behavior | Impact on later steps |
| --- | --- | --- |
| Aircraft cache | Stores whole JSON records in an account namespace | Additional classification fields survive download and persistence |
| Form initialization | `aircraftValues` spreads the original object | Unfamiliar fields survive initialization, but this is not proof the form can save them |
| Form validation | Only A/R; Class, one engine and one weight are required | Must change before offering Glider, Powered-Lift or Lighter-Than-Air |
| Class choices | Aircraft form filters the six existing classes using the rotorcraft distinction | Replace with explicit category/class mapping |
| Aircraft detail | Unknown category/class labels fall back to “Not set” | Add labels and distinguish class-not-applicable from missing classification |
| Outbox | Copies the complete payload into a durable operation with its revision | New fields survive queuing; server acceptance still requires a compatible API |
| Refresh during edit | Preserves pending local edits and the queued operation | Keep this behavior when adding category-specific fields |
| Sync dependencies | Aircraft uploads precede Tailnumbers, then Flights | Preserve ordering and dependency checks |
| Totals/statistics | Version-1 parser accepts additional group labels and metadata | Prefer additive API changes; version 2 currently rejects the response |

## Verification

```sh
./scripts/mobile run test
```

Or run the dedicated tests with the project's Node 24 runtime:

```sh
node --test tests/classificationCompatibility.test.mjs
```

The compatibility probes intentionally use an unrecognized synthetic category
and extra test-only metadata. They do not establish the final database codes or
field names. No physical-device cache was exported or modified.

The Django branch contains the read-only management command
`audit_aircraft_classifications` and its report documentation. Account-specific
JSON baselines stay outside both repositories. Server validation, classification
choices, migrations and summary changes belong to subsequent reviewed steps.
